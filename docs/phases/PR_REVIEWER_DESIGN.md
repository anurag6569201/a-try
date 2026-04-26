# World-Class AI PR Reviewer — Full Design

## Vision

Not just "AI reads the diff and comments." This is a multi-agent system that:

1. **Builds a knowledge graph of the codebase** — understands symbol relationships, call chains, data flow, not just the changed lines
2. **Runs 7 parallel specialist agents** — each an expert in one domain (security, logic, performance, types, tests, docs, architecture)
3. **Grounds findings in evidence** — cites exact file:line, quotes the relevant code, explains *why* it's a problem
4. **Learns from history** — uses pgvector embeddings of past reviews to avoid re-flagging already-accepted patterns
5. **Posts inline GitHub review comments** — findings appear as annotations on the diff lines, not just a wall of text in one comment
6. **Rates itself** — estimates confidence per finding; low-confidence findings are surfaced separately to avoid noise

The output looks like a senior engineer spent 2 hours reviewing the PR.

---

## What CodeRabbit does vs what we'll do

| Capability | CodeRabbit | PreviewQA Reviewer |
|---|---|---|
| Diff reading | ✅ | ✅ |
| Security scan | Basic regex | ✅ Multi-model + SAST patterns |
| Logic analysis | Single-pass LLM | ✅ 7 specialist agents |
| Codebase context | ❌ File-at-a-time | ✅ Knowledge graph (symbol → callers → dependencies) |
| Inline annotations | ✅ | ✅ |
| Test coverage gaps | ❌ | ✅ Knows your test structure |
| Similar past findings | ❌ | ✅ pgvector semantic search |
| Confidence scoring | ❌ | ✅ Per-finding confidence |
| Prompt injection protection | ❌ | ✅ Existing sanitizeForLlm() |
| Learning from dismissals | ❌ | ✅ Dismissed finding embeddings |
| Architecture impact | ❌ | ✅ Call graph analysis |
| Performance analysis | ❌ | ✅ DB query, bundle size, re-render agent |

---

## Architecture: Multi-Agent Review Pipeline

```
PR opened / synchronize
        │
        ▼
[ORCHESTRATOR] handlePrReview(prId)
        │
        ├─ 1. Build Context Bundle
        │     ├─ getDiff() → raw diff
        │     ├─ getChangedFiles() → file list
        │     ├─ fetchFileContents() → full content of changed files + neighbors
        │     └─ buildKnowledgeGraph() → symbol index
        │
        ├─ 2. Spawn 7 Specialist Agents (PARALLEL)
        │     ├─ SecurityAgent
        │     ├─ LogicAgent
        │     ├─ TypeSafetyAgent
        │     ├─ PerformanceAgent
        │     ├─ TestCoverageAgent
        │     ├─ ArchitectureAgent
        │     └─ DocumentationAgent
        │
        ├─ 3. Synthesizer Agent (sequential, reads all agent outputs)
        │     ├─ Deduplicates overlapping findings
        │     ├─ Scores overall PR risk (low/medium/high/critical)
        │     ├─ Writes executive summary
        │     └─ Ranks findings by severity × confidence
        │
        ├─ 4. History Grounding
        │     ├─ Embed each finding → query pgvector for similar past findings
        │     ├─ If similar finding was dismissed → lower confidence, add note
        │     └─ If similar finding was accepted → raise confidence
        │
        ├─ 5. Format & Post
        │     ├─ Sticky summary comment (executive summary + severity matrix)
        │     └─ Inline review annotations (per finding with file+line)
        │
        └─ 6. Store review_record + finding_record rows
```

---

## The 7 Specialist Agents

Each agent receives:
- The diff (chunked if large)
- Full content of changed files
- Symbol knowledge graph excerpt relevant to the changed code
- PR title + body (sanitized)
- Repo language/framework hints

Each returns: `Finding[]` with `{ severity, file, line, title, body, suggestion, confidence }`

### Agent 1: SecurityAgent

**What it catches:**
- Hardcoded secrets, tokens, API keys (beyond regex — LLM understands context: `const secret = "test"` vs `const secret = process.env.SECRET`)
- SQL injection via string interpolation (even with ORMs)
- XSS: `dangerouslySetInnerHTML`, unescaped user input in templates
- IDOR: missing authorization checks before data access
- Path traversal: `fs.readFile` with user-controlled path
- Prototype pollution: object spread from untrusted input
- Dependency additions: flags newly added packages with known CVEs (checks via OSV API)
- SSRF: outbound HTTP calls with user-controlled URLs
- Race conditions in auth flows (TOCTOU)
- Mass assignment: REST endpoints that accept `...req.body` without allowlist

**Prompt structure:**
```
SYSTEM: You are a senior application security engineer specializing in web vulnerabilities.
You have deep knowledge of OWASP Top 10, CWE/SANS, and JavaScript/TypeScript security patterns.
Analyze the code change below and find REAL security issues only.
A "real" issue requires all three: (1) the vulnerability exists in this code, (2) it is exploitable,
(3) it is NOT already mitigated by the surrounding context.
Do NOT flag: theoretical vulnerabilities, already-guarded code paths, test files.

USER: [diff + file content + knowledge graph excerpt]

Return JSON: { findings: Finding[] }
Each Finding: { severity, file, line, title, body, suggestion, confidence, cwe? }
```

**External enrichment:** OSV.dev API for dependency CVE lookups (non-blocking, best-effort).

---

### Agent 2: LogicAgent

**What it catches:**
- Off-by-one errors in loops, array access, pagination
- Null/undefined dereferences not caught by TypeScript (runtime paths)
- Wrong comparison operators (== vs ===, inclusive/exclusive ranges)
- Missing early returns / guard clauses that change behavior
- State mutation side effects (mutating function arguments)
- Incorrect async/await usage (missing await, fire-and-forget where error matters)
- Race conditions in concurrent code (shared state without locking)
- Wrong error propagation (swallowed exceptions, wrong error type thrown)
- Business logic errors that contradict the PR description

**Prompt structure:**
```
SYSTEM: You are a principal software engineer specializing in finding subtle logic bugs.
You think like a computer: trace execution paths, consider edge cases, follow data through functions.
You have access to the call graph showing who calls the changed functions.

Rules:
- Only flag bugs with a concrete reproduction scenario.
- State the exact input or condition that triggers the bug.
- Distinguish between "will crash" (error severity) and "wrong result" (warning severity).
```

**Knowledge graph usage:** Fetches callers of changed functions — if a changed function's return type changes, checks all call sites for compatibility.

---

### Agent 3: TypeSafetyAgent

**What it catches:**
- `as` casts that hide real type errors (especially `as any`, `as unknown as X`)
- Missing null checks on optional chaining chains
- Non-null assertion `!` on values that could genuinely be null at runtime
- Implicit `any` from untyped JSON.parse, fetch responses without type guards
- Discriminated union exhaustion (switch missing cases)
- Incorrect generic constraints
- Return type mismatches between function signature and implementation
- Type narrowing that doesn't hold across async boundaries

**Prompt structure:** Feed the TypeScript file + its type context (imported interfaces) + the diff.

---

### Agent 4: PerformanceAgent

**What it catches:**
- **Database**: N+1 queries (loop calling DB), missing indexes on filtered/sorted columns, SELECT * where specific columns suffice, missing LIMIT on unbounded queries
- **Frontend**: Missing `key` props in lists, unnecessary re-renders (object literals in props, functions created in render), heavy components not lazy-loaded, large images without optimization
- **Bundle**: New large dependencies (checks package size via bundlephobia-compatible logic), duplicate packages
- **API**: Missing pagination on list endpoints, unbounded array operations in memory
- **Caching**: Cache invalidation bugs, missing cache headers on static assets

**Prompt structure:**
```
SYSTEM: You are a performance engineer. For each issue you flag, you MUST estimate:
- Magnitude: how much slower/larger/more expensive (rough order of magnitude)
- Condition: under what load/data size does it matter
Do NOT flag micro-optimizations (< 5% impact). Flag things that will hurt at production scale.
```

---

### Agent 5: TestCoverageAgent

**What it catches:**
- New functions/classes with zero test coverage
- Changed conditional branches not exercised by existing tests
- Edge cases not tested: empty input, null input, max-length input, concurrent calls
- Happy-path-only tests (no error case coverage)
- Test code quality issues: `expect(true).toBe(true)`, assertions that always pass, tests that don't actually test the change
- Missing integration test for new API endpoints
- Snapshot tests that need updating

**How it knows about existing tests:** Reads test files neighboring the changed source files from the repo, fetched via `getFileContent()`.

**Output:** Suggests specific test cases with pseudocode.

---

### Agent 6: ArchitectureAgent

**What it catches:**
- Layer violations (e.g., UI component importing directly from DB layer)
- Circular dependency introduction
- Breaking API contract changes (removing exported functions/types, changing signatures)
- Introducing new patterns that diverge from established project conventions
- God objects / overly large modules (file > 500 lines that got bigger)
- Premature abstraction (single-use abstractions added speculatively)
- Missing error boundary / fallback for new async operations
- State management anti-patterns

**Knowledge graph usage:** Compares the import graph before/after the diff to detect new cross-layer dependencies.

---

### Agent 7: DocumentationAgent

**What it catches:**
- Public APIs (exported functions) with no JSDoc
- Changed function signatures where docs are now stale
- README that references code paths that changed
- Environment variables added without documentation
- Complex algorithms missing explanatory comments
- Migration guides needed for breaking changes

**Threshold:** Only flags missing docs on exported symbols or public-facing config. Does NOT flag missing inline comments (leave that to the engineer).

---

## Knowledge Graph: What It Is and How We Build It

The knowledge graph is built **per PR** from the repo contents. It's not a persistent index (too expensive to maintain) — it's built on-demand from the changed files + their dependencies.

### What the graph contains

```typescript
interface KnowledgeGraph {
  symbols: Map<string, Symbol>;
  // Symbol: { name, kind, file, line, exportedAs, type }
  edges: Edge[];
  // Edge: { from: symbolId, to: symbolId, kind: 'calls' | 'imports' | 'extends' | 'implements' }
}
```

### How it's built

```
1. Parse changed files with TypeScript compiler API (ts-morph)
   → extract: exports, functions, classes, interfaces, imports

2. For each import in changed files:
   → fetch that file from GitHub (getFileContent)
   → extract its exports

3. Build edges:
   - A calls B: if function A has a call expression to function B
   - A imports B: import statement
   - A extends B: class heritage
   - A implements B: interface implementation

4. For each changed function:
   → search changed files + neighbor files for callers
   → add "called by" edges

5. Serialize relevant subgraph as JSON for each agent's context
```

**Tool**: `ts-morph` (TypeScript compiler API wrapper). Lightweight — we only parse the changed files + 1 hop of their dependencies, not the entire repo.

**Fallback**: If ts-morph parsing fails (non-TS files, parse errors), fall back to simple import/export regex extraction.

---

## Synthesizer Agent

After all 7 agents return their findings, the Synthesizer runs a final LLM pass:

**Input**: All findings from all agents + PR description + risk scores

**Tasks**:
1. **Deduplicate**: Remove findings that refer to the same code location with similar meaning
2. **Rank**: Sort by `severity × confidence` — errors first, then warnings, then info
3. **Executive summary**: 2-3 sentences summarizing what the PR does and its overall risk
4. **PR score**: `LGTM` / `Needs minor fixes` / `Needs major fixes` / `Do not merge`
5. **Walkthrough**: Per-file summary of what changed and why it matters

**Output structure**:
```typescript
interface SynthesizedReview {
  score: 'lgtm' | 'minor' | 'major' | 'block';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  executiveSummary: string;
  walkthrough: FileWalkthrough[];
  findings: RankedFinding[];  // deduplicated, ranked
  stats: { errors: number; warnings: number; info: number; agentsRun: number }
}
```

---

## History Grounding with pgvector

We reuse the existing `run_embedding` infrastructure pattern with a new table:

```sql
CREATE TABLE review_finding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES review_record(id),
  agent           TEXT NOT NULL,          -- 'security', 'logic', etc.
  severity        TEXT NOT NULL,
  file            TEXT NOT NULL,
  line            INTEGER,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  suggestion      TEXT,
  confidence      TEXT NOT NULL,          -- 'high', 'medium', 'low'
  status          TEXT NOT NULL DEFAULT 'open', -- 'open', 'dismissed', 'accepted'
  embedding       vector(1536),           -- embedding of title + body
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON review_finding USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**On each review:**
1. Embed each finding (`title + ": " + body`)
2. Query for the 3 most similar past findings (cosine similarity > 0.88)
3. If similar finding has `status = 'dismissed'` → add note: *"Similar finding was previously dismissed by @user — review if this still applies"* + lower confidence
4. If similar finding has `status = 'accepted'` → raise confidence
5. If identical finding (similarity > 0.97) was dismissed → suppress entirely (don't re-post)

**Dismissal tracking:** When a user resolves a GitHub inline review comment, a webhook fires (`pull_request_review_thread` event). We update the `review_finding.status` based on whether they clicked "Resolve" or left a reply like "won't fix".

---

## Diff Chunking Strategy

Large PRs (400+ files, 50k+ lines) can't fit in one LLM context. Strategy:

```
1. Split diff by file
2. Assign each file to an agent based on file type:
   - *.sql → PerformanceAgent (query analysis) + SecurityAgent (injection)
   - *.test.ts, *.spec.ts → TestCoverageAgent only
   - *.md → DocumentationAgent only
   - All others → all relevant agents
3. Within a file, chunk at function/class boundaries (not mid-function)
   using ts-morph AST, or at blank lines for non-TS files
4. Each chunk ≤ 6000 tokens (≈24000 chars)
5. Each agent processes its assigned chunks sequentially, accumulating findings
6. If total files > 200: only analyze the "hot" files
   (files with most additions+deletions, up to 200)
```

---

## The GitHub Comment

### Sticky summary comment

```markdown
<!-- previewqa:review:{{prId}} -->
## PreviewQA Review · PR #30

> 🟡 **Needs minor fixes** · Risk: medium · 12 findings (2 errors, 6 warnings, 4 info)

### What this PR does
Updates the landing page hero section with a new headline, refreshed badge copy, and a
different secondary CTA. Changes are purely cosmetic — no logic, no data, no API.

### File walkthrough
| File | Change |
|------|--------|
| `src/pages/Landing.tsx` | Hero headline, badge text, and CTA button updated. No data flow changes. |

### Findings
| Sev | Agent | Finding | Location |
|-----|-------|---------|----------|
| 🔴 error | Security | Hardcoded GitHub App URL — should be env var | Landing.tsx:78 |
| 🟡 warn | Logic | Button `asChild` prop has no null guard if `asChild` element is null | Landing.tsx:82 |
| 🟡 warn | Tests | No snapshot or render test for Landing component | — |
| 🔵 info | Docs | New badge copy changes user-facing text — update CHANGELOG? | Landing.tsx:65 |

> Inline annotations are posted as review comments on the diff.

---
*7 agents · 34 findings before dedup · rendered in 18s · [View on dashboard](https://...)*
```

### Inline review comments (on the diff)

For each `error` or `warning` finding with a line number, we post a GitHub Pull Request Review comment on the exact diff line:

```
🔴 Security · High confidence

**Hardcoded GitHub App URL**
`href="https://github.com/apps/preview-qa"` is hardcoded. If the app slug changes
or you want to support different environments, this will break.

**Suggested fix:**
```tsx
href={import.meta.env.VITE_GITHUB_APP_URL ?? 'https://github.com/apps/preview-qa'}
```

Add `VITE_GITHUB_APP_URL` to your `.env` and Vercel env vars.
```

---

## New Package: `packages/code-reviewer`

### File structure

```
packages/code-reviewer/
  src/
    index.ts              — reviewPR() main entry point
    knowledge-graph.ts    — buildKnowledgeGraph() using ts-morph
    diff-chunker.ts       — splitDiffByFile(), chunkFile(), assignAgents()
    agents/
      security.ts         — SecurityAgent
      logic.ts            — LogicAgent
      type-safety.ts      — TypeSafetyAgent
      performance.ts      — PerformanceAgent
      test-coverage.ts    — TestCoverageAgent
      architecture.ts     — ArchitectureAgent
      documentation.ts    — DocumentationAgent
      synthesizer.ts      — SynthesizerAgent
    history.ts            — embedFinding(), queryHistory(), suppressDismissed()
    formatter.ts          — formatSummaryComment(), formatInlineComment()
    osv.ts                — fetchCVEsForPackage() via OSV.dev API
    types.ts              — Finding, ReviewOutput, KnowledgeGraph, etc.
  package.json
  tsconfig.json
```

### Main entry point

```typescript
export async function reviewPR(input: ReviewInput): Promise<ReviewOutput> {
  // 1. Build context
  const context = await buildContext(input);  // diff + files + graph

  // 2. Run agents in parallel
  const [security, logic, types, perf, tests, arch, docs] = await Promise.allSettled([
    runSecurityAgent(context),
    runLogicAgent(context),
    runTypeSafetyAgent(context),
    runPerformanceAgent(context),
    runTestCoverageAgent(context),
    runArchitectureAgent(context),
    runDocumentationAgent(context),
  ]);

  // 3. Collect findings (ignore rejected agents — don't fail entire review)
  const allFindings = collectSettled([security, logic, types, perf, tests, arch, docs]);

  // 4. Synthesize
  const review = await runSynthesizer(context, allFindings);

  // 5. Ground in history
  const groundedFindings = await groundInHistory(pool, review.findings);

  // 6. Return
  return { ...review, findings: groundedFindings };
}
```

---

## New AI prompts to add to `packages/ai`

| Prompt name | Deployment | Purpose |
|-------------|-----------|---------|
| `codeReviewSecurity` | gpt-4o | Security vulnerability analysis |
| `codeReviewLogic` | gpt-4o | Logic bug detection |
| `codeReviewTypes` | gpt-4o | Type safety analysis |
| `codeReviewPerformance` | gpt-4o | Performance issue detection |
| `codeReviewTests` | gpt-4o | Test coverage gap analysis |
| `codeReviewArchitecture` | gpt-4o | Architecture violation detection |
| `codeReviewDocumentation` | gpt-4-turbo | Doc quality (cheaper model, lower stakes) |
| `codeReviewSynthesizer` | gpt-4o | Final dedup, rank, summarize |

All use **structured output** (JSON schema) so findings are machine-readable. No markdown fences in LLM output.

---

## New github-adapter functions needed

```typescript
// Fetch full diff as text
getDiff(octokit, owner, repo, pullNumber): Promise<string>

// Post a GitHub PR Review (with inline comments)
createReview(octokit, input: CreateReviewInput): Promise<number>
// CreateReviewInput: { owner, repo, pullNumber, commitId, body, comments: InlineComment[] }
// InlineComment: { path, line, side, body }

// Dismiss a review (if we need to update inline comments)
dismissReview(octokit, owner, repo, pullNumber, reviewId, message): Promise<void>
```

---

## New DB migrations

### Migration 004: review_record + review_finding

```sql
CREATE TABLE review_record (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id     UUID NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  github_comment_id   BIGINT,
  github_review_id    BIGINT,
  body_hash           TEXT NOT NULL DEFAULT '',
  score               TEXT,   -- 'lgtm' | 'minor' | 'major' | 'block'
  risk_level          TEXT,   -- 'low' | 'medium' | 'high' | 'critical'
  agents_run          INTEGER DEFAULT 0,
  findings_count      INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON review_record(pull_request_id);

CREATE TABLE review_finding (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id       UUID NOT NULL REFERENCES review_record(id) ON DELETE CASCADE,
  agent           TEXT NOT NULL,
  severity        TEXT NOT NULL,
  file            TEXT,
  line            INTEGER,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  suggestion      TEXT,
  confidence      TEXT NOT NULL DEFAULT 'medium',
  status          TEXT NOT NULL DEFAULT 'open',
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON review_finding(review_id);
CREATE INDEX ON review_finding USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## Dependencies to add

| Package | Where | Purpose |
|---------|-------|---------|
| `ts-morph` | `packages/code-reviewer` | TypeScript AST parsing for knowledge graph |
| (nothing else) | — | All other infrastructure already exists |

OSV.dev is a free public API — no SDK needed, plain fetch.

---

## Orchestrator integration

### What to add to `apps/orchestrator/src/index.ts`

The orchestrator already handles `PullRequestOpened` and `PullRequestSynchronize`. Add a new handler call after creating the run:

```typescript
// In handlePullRequestEvent, after createRun():
void handlePrReview(ctx, prId).catch(err => {
  ctx.log.error({ err }, 'PR review failed — non-fatal');
});
// Non-blocking: review runs in parallel with the QA run
```

### New file: `apps/orchestrator/src/pr-review-handler.ts`

```typescript
export async function handlePrReview(ctx: OrchestratorContext, prId: string): Promise<void> {
  // 1. Load PR from DB
  // 2. Get octokit for installation
  // 3. Fetch diff + changed files
  // 4. Run reviewPR() from packages/code-reviewer
  // 5. Upsert review_record
  // 6. Post inline review via createReview()
  // 7. Post/update sticky summary comment
}
```

---

## Build order (implementation sequence)

### Week 1: Foundation

| Day | Ticket | What |
|-----|--------|------|
| 1 | CR-1 | DB migration 004 (review_record + review_finding tables) |
| 1 | CR-2 | packages/code-reviewer scaffold + types.ts |
| 2 | CR-3 | knowledge-graph.ts (ts-morph AST parser) |
| 2 | CR-4 | diff-chunker.ts (split by file, chunk by function boundary) |
| 3 | CR-5 | github-adapter: getDiff() + createReview() |
| 3 | CR-6 | ai package: 8 new prompt functions (structured output, Zod schemas) |
| 4 | CR-7 | agents/security.ts + agents/logic.ts (highest value) |
| 4 | CR-8 | agents/type-safety.ts + agents/performance.ts |
| 5 | CR-9 | agents/test-coverage.ts + agents/architecture.ts + agents/documentation.ts |

### Week 2: Integration + Polish

| Day | Ticket | What |
|-----|--------|------|
| 1 | CR-10 | agents/synthesizer.ts (dedup + rank + executive summary) |
| 2 | CR-11 | history.ts (embed findings, query pgvector, suppress dismissed) |
| 2 | CR-12 | formatter.ts (summary comment + inline comment markdown) |
| 3 | CR-13 | orchestrator: pr-review-handler.ts |
| 3 | CR-14 | osv.ts (CVE lookup for new dependencies) |
| 4 | CR-15 | End-to-end test on a-try PR, tune prompts |
| 5 | CR-16 | Dismissal tracking: `pull_request_review_thread` webhook handler |

---

## Quality bar for prompts

Every agent prompt follows this structure:

```
SYSTEM:
  Role: "You are a [specialist]. You [specific expertise]."
  Task: "Analyze the following code change. [precise instructions]"
  Rules:
    - "Only flag [X] if [concrete condition]. Do NOT flag [anti-pattern 1], [anti-pattern 2]."
    - "For each finding, you MUST provide [evidence requirement]."
    - "Confidence must be 'high' only if [specific criteria]."
  Output format: "Return ONLY valid JSON matching this schema: [JSON schema]"
  Failure mode: "If you find no issues, return { findings: [] }. Never invent findings."

USER:
  ## PR Context
  Title: {{prTitle}}
  Description: {{sanitizedPrBody}}

  ## Changed Files
  {{changedFilesList}}

  ## Diff
  {{chunk}}

  ## Full file content (for context)
  {{fileContents}}

  ## Call graph (who calls the changed functions)
  {{knowledgeGraphExcerpt}}
```

The `Failure mode` instruction is the most important — it prevents hallucinated findings.

---

## Definition of done for PR Reviewer

- [ ] PR opened on any repo with the app installed → review comment appears within 90 seconds
- [ ] Inline annotations appear on specific diff lines for error/warning findings
- [ ] Security agent catches a real hardcoded-URL finding in the landing page PR
- [ ] Similar findings from prior dismissed reviews are suppressed
- [ ] OSV CVE check runs on any PR that adds a new npm dependency
- [ ] Knowledge graph correctly identifies callers of changed functions
- [ ] Large PRs (100+ files) handled without timeout via chunking
- [ ] Review updates (doesn't duplicate) when new commits are pushed
- [ ] All 7 agents run in < 30s total (parallel, on gpt-4o)
- [ ] CI passes (lint + typecheck) after all new code
