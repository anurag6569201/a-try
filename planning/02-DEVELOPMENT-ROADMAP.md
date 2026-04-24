# Development Roadmap

## Guiding rule

Do not build advanced repo intelligence before the basic preview QA loop is reliable.
Phases are gates — complete each before starting the next.

---

## Timeline overview

| Phase | Name | Duration | Outcome |
|---|---|---|---|
| Phase 0 | Foundation | Weeks 1–2 | Infra + monorepo + GitHub App ready |
| Phase 1 | Alpha — Core Loop | Weeks 3–6 | PR → preview → Playwright → GitHub result |
| Phase 2 | Beta — Instruction-Driven | Weeks 7–10 | YAML instructions drive test plan |
| Phase 3 | Hardening | Weeks 11–14 | Safe for multi-repo internal use |
| Phase 4 | Repo-Aware Intelligence | Weeks 15–18 | Diff-aware plan quality improvements |
| Phase 5 | Launch Readiness | Weeks 19–24+ | Multi-tenant, paid tiers live |

---

## Phase 0 — Foundation (Weeks 1–2)

### Objective
Create everything needed before a single line of product code runs.

### Tasks

| Task | Detail |
|---|---|
| Register GitHub App | Permissions: Pull requests rw, Issues w, Checks rw, Contents r, Metadata r, Commit statuses rw, Deployments r |
| Scaffold monorepo | pnpm workspaces + Turborepo + TypeScript base config + ESLint + Prettier |
| Provision Azure baseline via Terraform | Functions, Service Bus, Container Apps, Container Apps Jobs, PostgreSQL, Blob Storage, Key Vault, App Insights |
| Create local dev environment | `.env.example`, `docker-compose.yml` (local Postgres + Service Bus emulator) |
| Bootstrap CI pipeline | GitHub Actions: lint + type-check + test on every push |
| Create `packages/domain` | Enums: run states, failure categories, modes, event types |
| Write `.previewqa/config.yaml` schema draft | Per-repo config shape for future use |

### Monorepo structure to scaffold

```
/
├── apps/
│   ├── webhook-api/          # Azure Function — webhook intake
│   ├── orchestrator/         # Azure Container App — state machine
│   └── browser-runner/       # Azure Container Apps Job — Playwright
├── packages/
│   ├── domain/               # Enums, types, constants
│   ├── schemas/              # Zod schemas for webhooks + instructions
│   ├── db/                   # PostgreSQL migrations + repository layer
│   ├── github-adapter/       # Octokit wrapper (checks, comments, webhooks)
│   ├── vercel-adapter/       # Vercel preview URL resolution
│   ├── parser/               # PR body extraction + YAML validation
│   ├── planner/              # Instructions → normalized test plan
│   ├── runner-playwright/    # Playwright step executor + artifact capture
│   ├── reporter/             # GitHub comment + check formatting
│   ├── ai/                   # Azure OpenAI prompts (planner, summarizer)
│   └── observability/        # OpenTelemetry + Pino + App Insights wiring
└── infra/
    └── terraform/            # All Azure resources as code
```

### Exit criteria
- Webhook endpoint can receive and validate a fake GitHub PR event
- Fake PR event can be stored as a `run` record in PostgreSQL
- Terraform apply completes without errors in dev environment
- All CI checks pass on empty scaffold

---

## Phase 1 — Alpha: Core Loop (Weeks 3–6)

### Objective
Prove the end-to-end loop: PR open → preview URL resolved → Playwright smoke → GitHub result visible.

### Packages / apps to build

#### 1. `apps/webhook-api`
- Receive `pull_request.opened`, `.synchronize`, `.reopened` events
- Validate GitHub webhook signature (HMAC-SHA256)
- Normalize event → enqueue to Service Bus
- Return 202 immediately (never block on processing)
- Receive GitHub deployment status events for preview detection

#### 2. `packages/schemas`
- Zod schemas for all inbound GitHub webhook payloads
- Zod schemas for Service Bus message envelopes
- Zod schemas for run creation and state transitions

#### 3. `packages/github-adapter`
- Create and update GitHub Checks (`previewqa` check name)
- Upsert sticky PR comment (one comment per PR, updated in place)
- Fetch PR metadata (head SHA, description, author, fork detection)
- Post installation token refresh logic

#### 4. `packages/vercel-adapter`
- Resolve preview URL from Vercel API for a given repo + branch
- Poll GitHub deployment status events as fallback
- Handle preview not ready → return `waiting_for_preview` signal
- Handle Vercel protection bypass token injection

#### 5. `packages/db`
- PostgreSQL schema migrations for all 11 entities:
  - `installation`, `repository`, `pull_request`, `run`, `plan`, `test_case`, `result`, `artifact`, `comment_record`, `model_trace`, `audit_event`
- Repository layer (typed query functions, no raw SQL in business logic)
- Run state transition helpers

#### 6. `apps/orchestrator`
- Service Bus consumer — dequeue and route events
- State machine: `queued → waiting_for_preview → planning → running → analyzing → reporting → completed / failed`
- Superseded SHA detection — cancel stale runs when new commit pushed
- Preview polling loop with timeout and retry
- Orchestrate calls to parser → planner → runner → reporter in sequence

#### 7. `apps/browser-runner`
- Azure Container Apps Job definition
- Playwright base Docker image (Chromium, fixed version)
- Receive run plan as job input
- Execute smoke plan (default steps: navigate to root, take screenshot, assert 200)
- Upload artifacts to Azure Blob Storage
- Return structured result JSON

#### 8. `packages/runner-playwright`
- Step executor for smoke steps: `navigate`, `screenshot`, `assert_title`, `assert_visible`
- Artifact capture: screenshots on every step, trace on failure
- Structured result output: step-level pass/fail, error message, artifact references
- Per-step timeout enforcement

#### 9. `packages/reporter`
- Format sticky PR comment (Markdown) with:
  - overall result badge (pass / fail / blocked)
  - step-by-step outcome table
  - artifact links (screenshot, trace)
  - run metadata (SHA, timestamp, mode)
- Update GitHub Check with conclusion and output summary

### Smoke mode (default when no QA block)

Default smoke plan:
1. Navigate to preview root URL
2. Assert HTTP 200 (no error page)
3. Screenshot the root
4. Assert page title is not empty
5. Assert no JavaScript console errors (optional)

### Exit criteria (Milestone M1)
- On PR open, system creates a run record in DB
- If preview is ready, smoke run executes automatically
- If preview is not ready, run waits and retries (up to configured timeout)
- Result appears in PR as sticky comment with screenshot and trace link
- Superseded SHA cancels the old run cleanly
- GitHub Check shows pass or fail

---

## Phase 2 — Beta: Instruction-Driven (Weeks 7–10)

### Objective
Structured YAML test instructions embedded in the PR drive the test plan instead of a default smoke.

### Packages / apps to build

#### 1. `packages/parser`
- Extract `<!-- previewqa:start -->` / `<!-- previewqa:end -->` block from PR description
- Parse YAML content inside the block
- Validate against versioned Zod schema (see PR_INSTRUCTIONS_SPEC.md)
- Return: `{ parsed: Plan } | { error: ParseError[] }`
- On parse error: post clear guidance comment to PR

#### PR instruction YAML structure (summary)
```yaml
version: "1"
mode: instruction        # smoke | instruction | hybrid
steps:
  - description: "User can log in"
    navigate: /login
    actions:
      - fill: "[data-testid=email]" with "test@example.com"
      - fill: "[data-testid=password]" with "{{secret:TEST_PASSWORD}}"
      - click: "[data-testid=submit]"
    assert:
      - visible: "[data-testid=dashboard]"
  - description: "Dashboard loads"
    navigate: /dashboard
    assert:
      - visible: "[data-testid=header]"
      - not_visible: "[data-testid=error-banner]"
```

#### 2. `packages/planner`
- Convert validated parsed instructions → normalized `plan` + `test_case` records in DB
- Mode routing:
  - `smoke` → default smoke plan
  - `instruction` → explicit steps only
  - `hybrid` → explicit steps + smoke fallback appended
- AI-assisted step normalization (via `packages/ai`) for ambiguous selectors

#### 3. `packages/ai`
- Azure OpenAI client (model names from config, never hardcoded)
- Prompt: `plan_normalizer` — convert YAML step to canonical Playwright step
- Prompt: `failure_summarizer` — summarize runner output into human-readable explanation
- Prompt: `risk_classifier` — classify failure as `product_bug | test_bug | environment_issue | needs_clarification | flaky`
- Log all prompt input/output metadata to `model_trace` table
- Prompt regression test fixtures

#### 4. `apps/webhook-api` additions
- `issue_comment` event handler
- Recognize and route PR comment commands:
  - `/qa rerun` — cancel current run, create new run for head SHA
  - `/qa smoke` — create new smoke-only run for head SHA
  - `/qa help` — post command reference comment
- Validate commenter is repo collaborator before acting

### Run modes

| Mode | Trigger | Behavior |
|---|---|---|
| `smoke` | No QA block in PR | Default smoke plan runs |
| `instruction` | Valid QA block, `mode: instruction` | Only explicit YAML steps |
| `hybrid` | Valid QA block, `mode: hybrid` | Explicit steps + smoke appended |

### Exit criteria (Milestone M2)
- Valid QA block in PR description becomes executable test plan
- Invalid block produces parse error with clear guidance comment
- Hybrid mode runs explicit tests plus smoke checks
- Pass / fail / blocked outcomes clearly classified
- `/qa rerun` and `/qa smoke` commands work from PR comments
- AI failure summaries appear in PR comment on failure

---

## Phase 3 — Hardening (Weeks 11–14)

### Objective
Make the system safe and stable enough for broader internal use across multiple repos.

### Work items

#### Security
- Fork PR detection: check if `pull_request.head.repo.fork === true`
- Block authenticated runs for fork PRs by default
- Log `audit_event` for every fork policy enforcement decision
- Validate all untrusted inputs (PR title, body, comment text) before passing to LLM
- Redact secrets from logs and artifact metadata

#### Auth profiles
- Login profile resolution from Azure Key Vault at runner start
- Storage-state based login for trusted same-repo previews (Playwright `storageState`)
- Named profile references in YAML instructions: `login_as: standard-user`
- Sandbox account requirements documented for onboarding

#### Retry and timeout policy
- Per-phase timeout: preview wait (configurable, default 15min), runner (default 10min), reporter (2min)
- Transient failure retry with exponential backoff, max 3 attempts
- Classify each failure: `product_bug | test_bug | environment_issue | needs_clarification | flaky`
- `flaky` classification: automatic retry, mark as flaky in report if still failing

#### Observability
- OpenTelemetry spans across all components (webhook → queue → orchestrator → runner → reporter)
- Correlation ID propagated through every Service Bus message and job
- Pino structured JSON logs with `runId`, `installationId`, `repoId`, `sha` on every line
- App Insights custom metrics: run duration, preview resolution latency, false failure rate
- Dashboard: active runs, failure rate, cost per run estimate

#### Alerting (App Insights)
- Webhook signature failures spike (> 10/hour)
- Preview resolution failure spike (> 20% failure rate over 1 hour)
- Runner crash loop (3 consecutive crashes same run)
- Artifact upload failures
- Key Vault access failures
- Queue depth > 50 messages (sign of orchestrator falling behind)
- High timeout rate (> 15% of runs timing out)

#### Cost controls
- Default max run time: 10 minutes total (hard kill)
- Default max test cases per PR: 20 (configurable per repo)
- Default concurrency cap per installation: 5 parallel runs
- Video capture only on failure or explicit debug mode
- Artifact retention policy enforced by Azure Blob lifecycle rules:
  - Screenshots: 30 days
  - Traces: 14 days
  - Videos: 14 days
  - Logs: 30 days
  - Run metadata (DB): 90 days

### Exit criteria (Milestone M3 — Private Beta)
- Authenticated runs work for trusted same-repo PRs
- Fork PRs are safely limited to unauthenticated smoke
- Common transient failures retry correctly without manual intervention
- Platform-induced false failure rate < 5%
- App Insights dashboards show end-to-end run traces
- 3–5 repos running multiple workflows per day

---

## Phase 4 — Repo-Aware Intelligence (Weeks 15–18)

### Objective
Improve plan quality and risk awareness using repository diff context and run history.

### Work items

#### Changed-file heuristics
- Parse `pull_request` diff to extract changed file paths
- Map file paths to route/component heuristics:
  - `pages/` or `app/` → affected Next.js routes
  - `components/` → affected UI components
  - `api/` → affected API endpoints
- Add heuristic-based additional smoke checks to the plan for changed routes

#### AI-assisted plan suggestions
- When YAML block is present but diff touches routes not covered, suggest additions
- Planner prompt: given changed files + existing plan, recommend missing coverage
- Post suggestion as PR comment (informational, not blocking)

#### Retrieval layer (`pgvector`)
- Embed past run summaries and PR descriptions using Azure OpenAI embeddings
- Store embeddings in `pgvector` extension on existing PostgreSQL instance
- On new run: retrieve 3 most similar past runs for context in failure summarizer
- On new run: retrieve relevant past failures for the same route/component

#### Optional LangGraph integration
- Adopt LangGraph only if planner/analyst needs branching, retries, or multi-step reasoning
- Gate D: only adopt if single-prompt approach measurably fails in quality

### Deferred until after Phase 4 proves need

| Technology | Adopt trigger |
|---|---|
| tree-sitter | Route/component extraction from heuristics is insufficient |
| SCIP / LSIF | Symbol-level impact analysis is needed and heuristics fail |
| Neo4j | Graph queries across files/routes/components/tests become central |
| OpenSearch | Multi-repo hybrid keyword + semantic search is needed |
| Temporal | Long-running workflows and human approval checkpoints bottleneck |
| AKS / ArgoCD | Container Apps no longer meets concurrency or isolation needs |

### Exit criteria
- Planner can suggest relevant additional smoke checks for changed routes
- Historical failure retrieval improves failure summaries measurably
- Prompt regressions are caught by golden test fixtures before rollout

---

## Phase 5 — Launch Readiness (Weeks 19–24+)

### Objective
Prepare for real external, multi-tenant usage with paying customers.

### Work items

#### Multi-tenancy
- Per-installation data isolation at DB query level (all queries scoped by `installation_id`)
- Per-installation rate limiting: concurrent run cap, runs-per-hour cap
- Noisy installation cannot starve other customers
- Billing tier enforcement: run count limits, repo count limits

#### Onboarding flow
- GitHub App install flow → repo selection → first run triggered automatically
- Per-repo config wizard: guide customer through `.previewqa/config.yaml` setup
- Onboarding checklist: PR template in place, `data-testid` selectors, sandbox accounts
- First-run diagnostic: detect missing prerequisites and post guidance

#### Per-repo config (`previewqa/config.yaml` in customer repos)
```yaml
version: "1"
mode_default: hybrid
concurrency: 3
timeout_minutes: 10
max_cases: 20
artifact_retention_days: 30
fork_policy: smoke_only
login_profiles:
  - name: standard-user
    secret_key: PREVIEW_USER_CREDENTIALS
```

#### Dashboard (`apps/dashboard`)
- Installation management view
- Per-repo run history list
- Run detail: steps, artifacts, model trace
- Repo config editor
- Usage stats per installation (runs used, repos used vs. plan limits)

#### Usage analytics
- Track per-repo: runs/day, pass rate, defect catch rate, p90 resolution time
- Track per-installation: weekly active repos, total runs vs. limit
- Internal admin view: all installations, revenue-relevant metrics

#### Security review
- External penetration test or internal red team on fork PR policy
- Secrets audit: no credentials in logs, artifacts, or PR comments
- Dependency vulnerability scan
- GitHub App permission audit

#### Support runbooks (10 required at launch)
1. Preview URL not found
2. GitHub App auth failure (private key rotation)
3. Vercel token expired
4. Runner crash / container exit
5. Queue stuck (messages not consumed)
6. High timeout rate
7. Noisy repo / abusive reruns
8. Bad prompt/planner rollout (rollback procedure)
9. False failure spike investigation
10. Fork PR policy bypass attempt

### Launch bar — do not ship until all true
- ≥ 50 real internal PR runs completed successfully
- Preview resolution success rate consistently > 95%
- Platform-induced false failure rate < 5%
- Fork PR policy enforced and tested
- Artifacts and logs reliably available
- Multiple repos can onboard with predictable setup
- Support and debugging workflow documented
- Security review passed
- Billing tier enforcement working

---

## Package build order (strict dependency)

```
packages/domain
    ↓
packages/schemas
    ↓
packages/db
    ↓
packages/github-adapter    packages/vercel-adapter
    ↓                           ↓
apps/webhook-api
    ↓
apps/orchestrator
    ↓
packages/parser    packages/planner    packages/ai
    ↓
packages/runner-playwright
    ↓
apps/browser-runner
    ↓
packages/reporter
    ↓
packages/observability
    ↓
apps/dashboard (Phase 5)
```
