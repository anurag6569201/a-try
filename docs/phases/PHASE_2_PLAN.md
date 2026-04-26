# Phase 2 — AI Code Review + End-to-End PreviewQA Execution

## What this phase ships

Two things that work together end-to-end:

1. **CodeRabbit-killer**: AI-driven PR review posted as a sticky GitHub comment on every PR — diff analysis, security scan, logic critique, suggested test coverage gaps, and inline file annotations via GitHub's review API.
2. **Live PreviewQA execution**: The orchestrator picks up `queued` runs, waits for the Vercel preview, parses the test plan from the PR body, runs Playwright via the browser-runner, and posts a results comment back to the PR — with screenshots, per-step pass/fail, and AI failure classification.

Both are triggered by the existing webhook handler. No new entry points.

---

## Current state (what already exists)

| Component | State |
|-----------|-------|
| Webhook handler (`/webhooks/github`) | ✅ Working — creates `run` row on PR open/sync |
| DB schema (run, plan, test_case, result, artifact, comment_record) | ✅ Migrated |
| `packages/parser` | ✅ Parses YAML from PR body |
| `packages/planner` | ✅ Skeleton — OpenAI wiring exists |
| `packages/reporter` | ✅ Skeleton — comment formatting exists |
| `packages/github-adapter` | ✅ Skeleton — Octokit wiring exists |
| `packages/vercel-adapter` | ⚠️ Stub — needs real implementation |
| `apps/orchestrator` | ⚠️ Placeholder image deployed — no real logic |
| `apps/browser-runner` | ⚠️ Placeholder — no Playwright execution |
| `packages/ai` | ✅ OpenAI client — needs review + classification prompts |

---

## Sprint S-C: AI Code Review (CodeRabbit-killer)

**Goal**: On every PR open/synchronize, post a rich AI review comment to GitHub within 60 seconds.

### What the review comment contains

```
## PreviewQA Code Review

### Summary
One paragraph: what this PR does, risk level (low/medium/high), confidence.

### Issues found
| Severity | File | Line | Issue |
|----------|------|------|-------|

### Security scan
- [ ] No secrets/tokens hardcoded
- [ ] No SQL injection vectors
- [ ] No XSS surfaces
- [ ] Dependency changes audited

### Logic & correctness
Bullet list of potential bugs, edge cases, off-by-ones, missing null checks.

### Missing test coverage
Files changed with no corresponding test changes.

### Suggested improvements
Non-blocking: readability, naming, performance hints.
```

Plus GitHub **pull request review** annotations (inline comments on specific diff lines) for any `severity: error` findings.

### New DB table needed

```sql
-- tracks the review comment per PR so we can update it (sticky)
CREATE TABLE review_record (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id       UUID NOT NULL REFERENCES pull_request(id),
  github_comment_id BIGINT,
  github_review_id  BIGINT,
  body_hash   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### New package: `packages/code-reviewer`

```
packages/code-reviewer/
  src/
    index.ts          — main entry: reviewPR(prId, diff, changedFiles) → ReviewOutput
    diff-chunker.ts   — splits large diffs into ≤8k token chunks
    prompts.ts        — system + user prompts for review + security scan
    formatter.ts      — ReviewOutput → markdown comment body
    types.ts          — ReviewOutput, Finding, Severity
```

### Workflow

```
webhook: pull_request.opened / synchronize
  │
  ├─► [existing] create run row (queued)
  │
  └─► [NEW] enqueue review job on Service Bus topic: "pr.review"
        │
        orchestrator worker: handlePrReview()
          1. fetch PR diff via GitHub API (GET /repos/:owner/:repo/pulls/:number)
          2. fetch changed file list
          3. chunk diff → call code-reviewer.reviewPR()
             (parallel: general review + security scan + coverage check)
          4. upsert review_record
          5. POST GitHub PR review (createReview) with inline annotations
          6. POST/PATCH sticky comment (createOrUpdateComment)
```

### Key implementation files to touch

| File | Change |
|------|--------|
| `apps/api/src/routes/webhooks.ts` | On pull_request events, also publish to `pr.review` Service Bus topic |
| `apps/orchestrator/src/index.ts` | Subscribe to `pr.review` topic, call handlePrReview() |
| `packages/github-adapter/src/index.ts` | Add getDiff(), createReview(), createOrUpdateComment() |
| `packages/ai/src/index.ts` | Add reviewCode(chunks), scanSecurity(diff) — structured output with Zod |
| `packages/code-reviewer/src/index.ts` | **New** — orchestrates the above |
| `packages/db/migrations/` | Add `review_record` table migration |

### Prompt design (non-trivial)

The review prompt uses **structured output** (OpenAI response_format: json_schema) so findings are machine-readable for inline annotation. Three parallel calls:

1. **General review**: diff + PR title + body → findings[], summary, riskLevel
2. **Security scan**: diff only → securityFindings[] (secrets, injections, XSS)
3. **Coverage gap**: changedFiles[] + existingTestFiles[] → missingCoverage[]

Results are merged, deduplicated, and formatted.

---

## Sprint S-D: End-to-End PreviewQA Execution

**Goal**: The full loop — PR opens → run created → orchestrator picks it up → waits for Vercel → runs Playwright → posts results comment. Should work on the `a-try` repo against `a-try-web.vercel.app`.

### Vercel adapter (real implementation)

```typescript
// packages/vercel-adapter/src/index.ts
export async function resolvePreviewUrl(
  repoFullName: string,
  sha: string,
  token: string,
): Promise<string | null>
```

Strategy: poll `https://api.vercel.com/v6/deployments?gitSource.repoId=:id&target=preview` every 10s for up to 5 minutes, match by SHA. Return `url` when `readyState === 'READY'`.

### Orchestrator state machine

The `run` table already has these states: `queued → waiting_for_preview → planning → running → analyzing → reporting → completed | failed`

```
handleRun(runId):
  1. run.state = waiting_for_preview
     → poll vercel-adapter.resolvePreviewUrl() (5min timeout)
     → if timeout: run.state = failed, reason = "preview_timeout"

  2. run.state = planning
     → parser.parsePRBody(pr.body) → Plan | null
     → if Plan: save to plan table, test_case rows
     → if null: use smoke test defaults (navigate /, assert_visible body, screenshot)

  3. run.state = running
     → publish "run.execute" message to browser-runner queue
     → wait for "run.result" message back (or poll DB)

  4. run.state = analyzing
     → ai.classifyFailures(stepResults) → FailureCategory per failed step
     → update result rows

  5. run.state = reporting
     → reporter.formatComment(run, results, artifacts) → markdown
     → github-adapter.createOrUpdateStickyComment(pr, body)
     → github-adapter.updateCheckRun(run) → pass/fail GitHub Check

  6. run.state = completed | failed
```

### Browser runner (real implementation)

```
apps/browser-runner/src/
  index.ts         — Service Bus consumer: receives run.execute, publishes run.result
  executor.ts      — executes TestCase[] steps via Playwright
  step-runner.ts   — implements navigate, fill, click, assert_visible, screenshot, wait
  uploader.ts      — uploads screenshots + trace to Azure Blob Storage
  types.ts         — StepResult, ExecutionResult
```

Step runner maps YAML steps to Playwright actions:

```typescript
const STEP_MAP = {
  navigate:       (page, step) => page.goto(step.url),
  fill:           (page, step) => page.fill(step.selector, step.value),
  click:          (page, step) => page.click(step.selector),
  assert_visible: (page, step) => page.waitForSelector(step.selector, { state: 'visible' }),
  screenshot:     (page, step) => page.screenshot({ path: step.name }),
  wait:           (page, step) => page.waitForTimeout(step.ms),
};
```

### AI failure classification prompt

```
Given this failed Playwright step:
  action: {{action}}
  selector: {{selector}}
  error: {{errorMessage}}
  screenshot: [attached]

Classify this failure as exactly one of:
  - product_bug     (the UI changed in a way that broke the test intent)
  - test_bug        (the test selector/logic is wrong, not the product)
  - environment     (network error, preview not ready, infra issue)
  - flaky           (timing/race condition — would likely pass on retry)

Return JSON: { "category": "...", "reason": "one sentence", "suggested_fix": "..." }
```

### GitHub Check run wiring

On run creation (webhook), call `github-adapter.createCheckRun()` → status: `queued`.  
Update to `in_progress` when orchestrator picks it up.  
Update to `success` or `failure` with summary when done.

This is what makes the green/red Check appear in the PR like a CI job.

---

## Sprint S-E: Dashboard for reviews + runs (frontend)

**Goal**: Surface both AI reviews and test run results in the web dashboard.

### New pages / components

| Route | What it shows |
|-------|---------------|
| `/app/installations/:id/repos/:repoId/prs` | List of PRs with review status + run status |
| `/app/installations/:id/repos/:repoId/prs/:prId` | PR detail: AI review findings + test run results side by side |
| Run detail (existing) | Add artifact gallery (screenshots), step-by-step timeline |

### New API endpoints needed

| Endpoint | Purpose |
|----------|---------|
| `GET /api/installations/:id/repos/:repoId/prs` | List PRs with review + run counts |
| `GET /api/installations/:id/repos/:repoId/prs/:prId/review` | Latest review record |
| `GET /api/installations/:id/repos/:repoId/runs/:runId/artifacts` | Already exists |

---

## Infrastructure changes needed

### Service Bus topics to add

| Topic | Publisher | Consumer |
|-------|-----------|----------|
| `pr.review` | API webhook handler | Orchestrator |
| `run.execute` | Orchestrator | Browser runner |
| `run.result` | Browser runner | Orchestrator |

### New env vars needed

| Var | Where | Purpose |
|-----|-------|---------|
| `VERCEL_TOKEN` | Orchestrator | Already in Azure — needs mounting |
| `OPENAI_API_KEY` | Orchestrator + browser-runner | LLM calls |
| `AZURE_STORAGE_ACCOUNT` | Browser runner | Artifact uploads |
| `AZURE_STORAGE_CONTAINER` | Browser runner | Blob container name |
| `GITHUB_APP_PRIVATE_KEY` | Orchestrator | GitHub API auth (already in Key Vault) |
| `GITHUB_APP_ID` | Orchestrator | Already set |

### Container images to build and push

| Image | ACR tag | Notes |
|-------|---------|-------|
| `previewqa-orchestrator` | `latest` | Replace placeholder |
| `previewqa-browser-runner` | `latest` | New — needs `mcr.microsoft.com/playwright` base |

---

## Execution order

```
Week 1 — Sprint S-C (AI Code Review)
  Day 1-2: packages/code-reviewer + prompts + ai structured output
  Day 3:   github-adapter getDiff + createReview + sticky comment
  Day 4:   orchestrator worker + Service Bus pr.review topic
  Day 5:   DB migration + test on live PR

Week 2 — Sprint S-D (PreviewQA execution)
  Day 1:   vercel-adapter real implementation + polling
  Day 2:   browser-runner step-runner + Playwright executor
  Day 3:   orchestrator state machine (full loop)
  Day 4:   AI failure classification + GitHub Check run updates
  Day 5:   End-to-end test on a-try repo PR, fix issues

Week 3 — Sprint S-E (Dashboard)
  Day 1-2: PR list + PR detail pages (frontend)
  Day 3:   Artifact gallery in run detail
  Day 4:   Polish — loading states, error boundaries, empty states
  Day 5:   Smoke test entire product flow, fix regressions
```

---

## Definition of done for Phase 2

- [ ] Open a PR on `a-try` → AI review comment appears within 60s with findings, security scan, coverage gaps, and inline annotations
- [ ] PreviewQA detects Vercel preview URL automatically
- [ ] Playwright runs the `<!-- previewqa:start -->` test block from the PR body
- [ ] Results comment appears in PR: per-step pass/fail, screenshots linked, AI failure category
- [ ] GitHub Check turns green (pass) or red (fail) — not just "queued"
- [ ] Dashboard shows PR list, review findings, and run results with artifact gallery
- [ ] CI passes (lint + typecheck) on every commit
