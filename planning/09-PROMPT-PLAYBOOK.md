# Agent Prompt Playbook

> A complete, ordered list of prompts to give your coding agent — one per sprint.
> Copy the prompt exactly. Run the exit check before moving to the next.
> Never skip a sprint. Never run a later sprint if the previous exit check failed.

---

## How to read this file

Each entry contains:
- **Sprint** — which sprint this covers (matches `08-90-DAY-SPRINT.md`)
- **State check** — what must already be true before you run this prompt
- **Prompt** — paste this to your coding agent verbatim
- **Exit check** — what you verify yourself after the agent finishes
- **Mark done** — checkbox to tick when the sprint is confirmed complete

---

## Current milestone tracker

Update this table as you complete sprints.

| Milestone | Sprint that closes it | Done? |
|---|---|---|
| M1 — Internal Alpha | Sprint 1.5 | [ ] |
| M2 — Internal Beta | Sprint 2.4 | [ ] |
| M3 — Private Beta | Sprint 3.5 | [ ] |
| M4 — Launch Candidate | Sprint 5.6 | [ ] |

---

## Phase 0 — Foundation

---

### Sprint 0.1 — GitHub App + Azure Baseline

**State check:** Nothing. This is the very first action.
**Type:** HUMAN — no coding agent needed.

**Actions to take yourself:**
1. Go to github.com/settings/apps → New GitHub App
2. Set name, webhook URL (placeholder for now), and permissions:
   - Pull requests: Read & Write
   - Issues: Write
   - Checks: Read & Write
   - Contents: Read
   - Metadata: Read
   - Commit statuses: Read & Write
   - Deployments: Read
3. Generate a private key. Download the `.pem` file.
4. Log in to Azure Portal. Create a Resource Group.
5. Run `terraform init && terraform apply` once the baseline Terraform files exist (after Sprint 0.2).
6. Store the GitHub App private key in Azure Key Vault.
7. Fill in `.env.example` with all resource names and connection strings.

**Exit check:**
- [ ] GitHub App exists and has the correct permissions
- [ ] Azure Resource Group exists
- [ ] Private key is in Azure Key Vault (not on disk or in any file)
- [ ] `.env.example` has every required variable documented

**Mark done:** [ ]

---

### Sprint 0.2 — Monorepo Scaffold

**State check:** You have a GitHub repo. Node 20+ and pnpm installed locally.

**Prompt:**
```
You are bootstrapping the monorepo for Preview QA Agent, a GitHub-native SaaS that runs Playwright browser tests against Vercel preview deployments when a PR is opened, then posts results back to the PR.

Read these files first to understand the full context:
- AGENTS.md
- docs/REPOSITORY_STRUCTURE.md
- docs/ARCHITECTURE.md

Your job in this session is Sprint 0.2 — Monorepo Scaffold. Do not write any product logic yet.

Tasks:
1. Initialise pnpm workspaces with this structure:
   apps/webhook-api, apps/orchestrator, apps/browser-runner
   packages/domain, packages/schemas, packages/config, packages/db,
   packages/github-adapter, packages/vercel-adapter, packages/parser,
   packages/planner, packages/reporter, packages/runner-playwright,
   packages/ai, packages/observability, packages/shared
   infra/terraform, fixtures/preview-app

2. Configure Turborepo (turbo.json) with build, lint, typecheck, test pipelines.

3. Set up a strict shared TypeScript base config (tsconfig.base.json). Each package/app extends it.

4. Configure ESLint (flat config) and Prettier. ESLint must enforce:
   - no floating promises
   - explicit function return types
   - no-unused-vars as error

5. Add a root package.json with scripts: build, lint, typecheck, test, dev.

6. Create docker-compose.yml for local dev with:
   - postgres:16 on port 5432
   - mcr.microsoft.com/azure-storage/azurite on ports 10000-10002 (Blob + Queue + Table emulator)

7. Create .env.example with placeholder values for every env var the system will need (list them all — do not leave any undocumented).

8. Bootstrap GitHub Actions CI at .github/workflows/ci.yml:
   - Trigger: push and pull_request to main
   - Jobs: lint, typecheck, test (run in parallel)
   - Use pnpm caching

9. Each package should have a minimal package.json, index.ts exporting a placeholder, and tsconfig.json extending the base.

Do not write any business logic. Scaffold only.

Definition of done: `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass on the empty scaffold. CI is green.
```

**Exit check:**
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (no tests = pass)
- [ ] CI workflow runs and is green on GitHub
- [ ] All folder structure matches `docs/REPOSITORY_STRUCTURE.md`

**Mark done:** [ ]

---

### Sprint 0.3 — Domain Package + DB Schema

**State check:** Sprint 0.2 complete. Monorepo scaffold exists.

**Prompt:**
```
You are building Preview QA Agent. The monorepo scaffold already exists.

Read these files first:
- AGENTS.md
- docs/ARCHITECTURE.md (data model section)
- docs/WORKFLOWS.md (canonical run states and failure taxonomy)
- docs/REPOSITORY_STRUCTURE.md (packages/domain and packages/db responsibilities)

Your job is Sprint 0.3. Two packages to build:

## 1. packages/domain

Create the full domain layer. No vendor SDK imports allowed in this package.

Enums to define:
- RunState: queued, waiting_for_preview, planning, running, analyzing, reporting, completed, failed, blocked_environment, needs_human, canceled
- FailureCategory: product_bug, test_bug, environment_issue, needs_clarification, flaky
- RunMode: skip, smoke, instruction, hybrid, full
- EventType: pr_opened, pr_synchronize, pr_reopened, issue_comment, deployment_status
- ArtifactType: screenshot, trace, video, log

Types to define (TypeScript interfaces/types):
- RunIdentity { installationId, repositoryId, prNumber, headSha, mode }
- RunRecord (all fields from ARCHITECTURE.md data model)
- TestCase, Plan, Result, Artifact, AuditEvent (all from data model)

Business policies as constants:
- MAX_TEST_CASES_PER_RUN = 20
- MAX_STEPS_PER_CASE = 20
- DEFAULT_RUN_TIMEOUT_MS = 600_000
- DEFAULT_PREVIEW_WAIT_TIMEOUT_MS = 900_000
- MAX_RERUNS_PER_PR_PER_HOUR = 5

All types must be exported from packages/domain/index.ts.
Write unit tests covering every enum value and that RunIdentity is correctly typed.

## 2. packages/db

Use node-pg-migrate for migrations. Use the `pg` package for queries. No ORM.

Write migrations for all 11 entities:
installation, repository, pull_request, run, plan, test_case, result, artifact, comment_record, model_trace, audit_event

Schema must match the data model in docs/ARCHITECTURE.md exactly.

For the `run` table specifically:
- primary key: uuid
- unique constraint on (installation_id, repository_id, pr_number, head_sha, mode)
- state column uses the RunState enum values as a postgres enum type

Write typed repository functions for the `run` entity:
- createRun(identity: RunIdentity): Promise<RunRecord>
- getRun(id: string): Promise<RunRecord | null>
- updateRunState(id: string, state: RunState): Promise<void>
- cancelSupersededRuns(installationId, repositoryId, prNumber, currentSha): Promise<number>

Write integration tests for the repository functions using a real local Postgres instance (from docker-compose).

Definition of done:
- `pnpm typecheck` passes
- All domain types exported and tested
- `pnpm db:migrate` runs without error against local Postgres
- Repository function integration tests pass
```

**Exit check:**
- [ ] `packages/domain` exports all enums and types
- [ ] `pnpm db:migrate` runs cleanly
- [ ] All 11 tables exist in local Postgres
- [ ] `run` table has the unique constraint
- [ ] Repository function tests pass

**Mark done:** [ ]

---

### Sprint 0.4 — Zod Schemas

**State check:** Sprint 0.3 complete. Domain package exists.

**Prompt:**
```
You are building Preview QA Agent. packages/domain is complete.

Read these files:
- AGENTS.md
- docs/PR_INSTRUCTIONS_SPEC.md (the full YAML contract)
- docs/WORKFLOWS.md (trigger events)
- .github/PULL_REQUEST_TEMPLATE.md

Your job is Sprint 0.4 — build packages/schemas.

This package contains all Zod schemas. No business logic. No vendor imports except zod.

## Schemas to write:

### 1. GitHub webhook payloads
- PullRequestOpenedPayload (action, pull_request, repository, installation fields)
- PullRequestSynchronizePayload
- PullRequestReopenedPayload
- IssueCommentPayload (action, comment.body, issue.pull_request, repository, installation)
- DeploymentStatusPayload (deployment_status.state, deployment.environment, repository, installation)

Each must be a Zod schema that exports both the schema and the inferred TypeScript type.

### 2. PR instruction YAML (from docs/PR_INSTRUCTIONS_SPEC.md)
- StepSchema: union of all supported v1 step strings (goto, click, fill, select, wait, expect)
- TestCaseSchema: id (optional), name, priority (low/medium/high), steps, assertions
- PRInstructionSchema: version (literal 1), mode, preview_target, login_profile (optional), risk_areas (optional), test_cases (optional, required when mode is instruction or hybrid), out_of_scope (optional), notes (optional)

Use Zod .superRefine() to enforce: test_cases required when mode is instruction or hybrid.

### 3. Service Bus message envelopes
- RunCreatedMessage { type: 'run.created', runId, installationId, repositoryId, prNumber, headSha, mode, timestamp }
- RunCommandMessage { type: 'run.command', command: 'rerun'|'smoke'|'skip', prNumber, headSha, triggeredBy }

### 4. Repo config schema (.previewqa/config.yaml)
- Based on the example in docs/REPOSITORY_STRUCTURE.md
- RepoConfigSchema: version, preview, qa, auth, runner, smoke sections

## Tests to write:
- 5 valid and 5 invalid fixture inputs for PRInstructionSchema (use real examples from docs/PR_INSTRUCTIONS_SPEC.md)
- Parse error messages must be human-readable (test that .format() output is clear)
- Instruction mode without test_cases must fail validation with a clear message

Definition of done: All schemas parse valid fixtures. Invalid fixtures produce readable typed errors. `pnpm typecheck` passes.
```

**Exit check:**
- [ ] All schemas parse the fixtures from `docs/PR_INSTRUCTIONS_SPEC.md`
- [ ] `instruction` mode without `test_cases` fails with a clear error
- [ ] `pnpm typecheck` passes
- [ ] All schema tests green

**Mark done:** [ ]

---

## Phase 1 — Alpha: Core Loop

---

### Sprint 1.1 — Webhook API

**State check:** All Phase 0 sprints complete.

**Prompt:**
```
You are building Preview QA Agent. Phase 0 is complete: monorepo scaffold, domain types, DB schema, and Zod schemas all exist.

Read these files:
- AGENTS.md
- docs/WORKFLOWS.md (primary triggers section)
- docs/ARCHITECTURE.md (webhook API component)
- docs/OPERATIONS_AND_SECURITY.md (secrets rules)

Your job is Sprint 1.1 — build apps/webhook-api.

This is an Azure Functions app (Node.js v4 programming model, TypeScript).

## Functions to implement:

### 1. POST /api/github/webhook
- Validate GitHub webhook signature using HMAC-SHA256 (X-Hub-Signature-256 header vs. GITHUB_WEBHOOK_SECRET env var)
- If signature invalid: return 401, log the failure, do not process
- Parse and validate the payload using the correct Zod schema from packages/schemas based on the X-GitHub-Event header
- Route to the correct handler:
  - pull_request events (opened, synchronize, reopened) → normalize and enqueue RunCreatedMessage to Service Bus
  - issue_comment events → check if comment body starts with /qa → if yes, enqueue RunCommandMessage
  - deployment_status events → enqueue a preview-ready signal message
- Always return 202 immediately after enqueue. Never await execution logic.
- Unknown events: return 200 (GitHub expects 200 for all accepted webhooks)

### 2. GET /api/health
- Return { status: 'ok', timestamp: ISO string }

## Rules:
- Use packages/schemas for all payload validation
- Use packages/domain for all types
- Centralize config loading in packages/config (GITHUB_WEBHOOK_SECRET, SERVICE_BUS_CONNECTION_STRING, QUEUE_NAME)
- Use packages/observability for all logging — never console.log
- Every log line must include: eventType, installationId (if parseable), prNumber (if parseable), requestId
- Do not put any orchestration or business logic here — only validate, normalize, enqueue

## Tests:
- Unit test: valid signature → 202; invalid signature → 401
- Unit test: unknown event type → 200
- Unit test: pull_request.opened with valid payload → correct RunCreatedMessage shape on queue
- Unit test: /qa rerun comment → correct RunCommandMessage shape
- Mock Service Bus in unit tests; do not call real Azure

Definition of done: webhook function deployed to Azure Functions dev environment. Sending a real pull_request.opened webhook from a test GitHub repo produces a message on Service Bus and a run record in DB.
```

**Exit check:**
- [ ] Invalid signature → 401
- [ ] Valid `pull_request.opened` → message appears on Service Bus
- [ ] Health endpoint returns 200
- [ ] All unit tests green
- [ ] Deployed to Azure Functions dev

**Mark done:** [ ]

---

### Sprint 1.2 — GitHub Adapter + Vercel Adapter

**State check:** Sprint 0.4 complete. Can run parallel with Sprint 1.1.

**Prompt:**
```
You are building Preview QA Agent.

Read these files:
- AGENTS.md
- docs/ARCHITECTURE.md (GitHub App and Vercel adapter sections)
- docs/WORKFLOWS.md (preview resolution strategy, GitHub Check policy, sticky comment policy)
- docs/OPERATIONS_AND_SECURITY.md (GitHub App permissions, secrets rules)

Your job is Sprint 1.2 — build packages/github-adapter and packages/vercel-adapter.

## packages/github-adapter

Wraps Octokit. No business logic. Every function takes explicit typed parameters.

Functions to implement:

### GitHub Checks
- createCheck(params: { installationId, owner, repo, headSha, name: 'previewqa', status: 'queued'|'in_progress' }): Promise<{ checkRunId: number }>
- updateCheck(params: { installationId, owner, repo, checkRunId, status, conclusion?, output?: { title, summary, text } }): Promise<void>

### PR Comments (sticky comment pattern)
- upsertPRComment(params: { installationId, owner, repo, prNumber, body, markerTag: string }): Promise<{ commentId: number }>
  - Search existing PR comments for a comment containing the markerTag HTML comment
  - If found: edit it. If not found: create it.
  - Marker tag to use: <!-- previewqa-result -->

### PR Metadata
- getPRMetadata(params: { installationId, owner, repo, prNumber }): Promise<{ headSha, description, authorLogin, isFork, baseRef, headRef }>

### Installation Tokens
- getInstallationToken(installationId: number): Promise<string>
  - Use GitHub App private key from Key Vault (GITHUB_APP_PRIVATE_KEY env var, PEM format)
  - Cache tokens in memory with 5-minute TTL (tokens last 1 hour)

All functions must:
- Use packages/domain types for inputs/outputs
- Log every API call with duration and status using packages/observability
- Throw typed errors on GitHub API failures (do not swallow errors)

Tests:
- Unit tests with mocked Octokit for all functions
- Test that upsertPRComment edits existing comment when marker found
- Test that upsertPRComment creates new comment when marker not found
- Test that getInstallationToken caches correctly (mock GitHub API — second call should not make HTTP request)

## packages/vercel-adapter

Functions to implement:

### Preview Resolution
- resolvePreviewUrl(params: { owner, repo, branch, headSha, vercelToken: string }): Promise<{ url: string; state: 'ready'|'building'|'not_found' }>
  - Query Vercel API: GET /v6/deployments?teamId=&projectName=&target=preview
  - Find latest deployment where meta.githubCommitSha === headSha and state === 'READY'
  - If building: return state 'building'
  - If not found at all: return state 'not_found'

- resolvePreviewFromDeploymentStatus(payload: DeploymentStatusPayload): Promise<{ url: string } | null>
  - Extract preview URL from a GitHub deployment_status event when state === 'success'

Tests:
- Unit tests with mocked fetch for both functions
- Test not_found, building, and ready states

Definition of done: createCheck creates a real GitHub Check on a test repo. upsertPRComment creates and then edits a comment on a test PR. resolvePreviewUrl returns correct state for mocked responses.
```

**Exit check:**
- [ ] `createCheck` creates a visible GitHub Check on a test PR
- [ ] `upsertPRComment` creates then edits in place (test with two calls)
- [ ] `resolvePreviewUrl` handles `ready`, `building`, `not_found`
- [ ] All unit tests green
- [ ] No Octokit or Vercel API calls in domain or schemas packages

**Mark done:** [ ]

---

### Sprint 1.3 — Orchestrator + State Machine

**State check:** Sprints 1.1 and 1.2 complete.

**Prompt:**
```
You are building Preview QA Agent.

Completed so far: monorepo scaffold, domain, DB, schemas, webhook-api, github-adapter, vercel-adapter.

Read these files:
- AGENTS.md
- docs/WORKFLOWS.md (full state machine, lifecycle phases, cancellation rules, retry policy)
- docs/ARCHITECTURE.md (orchestrator component)

Your job is Sprint 1.3 — build apps/orchestrator.

This is an Azure Container App (long-running Node.js process).

## Responsibilities:
- Consume messages from Azure Service Bus queue
- Own the run state machine
- Coordinate: preview resolver → parser → planner → runner → reporter (in later sprints)
- For this sprint: implement everything up to and including preview resolution

## What to build:

### 1. Service Bus consumer
- Connect to Service Bus using SERVICE_BUS_CONNECTION_STRING env var
- Process messages one at a time (concurrency = 1 per instance for now)
- On RunCreatedMessage: call handleRunCreated()
- On RunCommandMessage: call handleRunCommand()
- Dead-letter messages that fail after 3 attempts
- Acknowledge (complete) messages only after successful processing

### 2. handleRunCreated(message: RunCreatedMessage)
- Look up or create installation and repository records in DB
- Create a run record (state: queued) using packages/db
- Call packages/github-adapter createCheck (status: queued)
- Call resolvePreview()

### 3. resolvePreview(runId: string)
- Update run state to waiting_for_preview
- Update GitHub Check to in_progress
- Poll packages/vercel-adapter resolvePreviewUrl every 30 seconds
- If ready: update run state to planning, store preview URL on run record, advance (stub advance to completed for now)
- If still building after DEFAULT_PREVIEW_WAIT_TIMEOUT_MS (15 min): update run state to blocked_environment, update GitHub Check to failure with message "Preview deployment not found within timeout"
- Log every poll attempt

### 4. Superseded SHA detection
- In handleRunCreated, before creating a new run: call cancelSupersededRuns() from packages/db
- Any run for the same (installation, repo, PR) with a different SHA and state not in [completed, failed, canceled] → set state to canceled, update GitHub Check to canceled

### 5. handleRunCommand(message: RunCommandMessage)
- /qa rerun: cancel current active run for the PR, create new RunCreatedMessage and re-enqueue
- /qa smoke: create new RunCreatedMessage with mode=smoke and enqueue
- /qa help: call github-adapter upsertPRComment with help text

## Config:
- All env vars loaded through packages/config
- Required: SERVICE_BUS_CONNECTION_STRING, QUEUE_NAME, DATABASE_URL, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, VERCEL_TOKEN

## Logging:
- Every state transition logged with { runId, fromState, toState, trigger }
- Every poll attempt logged with { runId, attempt, result }

## Tests:
- Unit test state transitions (mock DB and adapters)
- Unit test superseded SHA detection (two runs for same PR, different SHA)
- Unit test preview timeout → blocked_environment

Definition of done: A real PR event flows through webhook-api → Service Bus → orchestrator → DB state transitions → GitHub Check updated. Preview polling works against a real Vercel deployment.
```

**Exit check:**
- [ ] PR event → run created in DB (state: `queued` → `waiting_for_preview` → `planning`)
- [ ] GitHub Check shows `in_progress` in real GitHub UI
- [ ] New commit push → old run canceled → new run created
- [ ] Preview timeout → run state is `blocked_environment`
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 1.4 — Playwright Runner + Artifact Upload

**State check:** Sprint 1.2 complete. Can run parallel with Sprint 1.3.

**Prompt:**
```
You are building Preview QA Agent.

Read these files:
- AGENTS.md
- docs/ARCHITECTURE.md (browser execution layer)
- docs/WORKFLOWS.md (runner execution section)
- docs/OPERATIONS_AND_SECURITY.md (browser runner isolation, artifact retention)

Your job is Sprint 1.4 — build packages/runner-playwright and apps/browser-runner.

## packages/runner-playwright

A pure execution library. No Azure, no GitHub, no DB imports.

### Types (extend packages/domain):
- SmokeStep: { type: 'navigate'|'screenshot'|'assert_title'|'assert_visible'|'assert_200', selector?: string, value?: string }
- StepResult: { stepIndex: number, type: string, passed: boolean, errorMessage?: string, screenshotPath?: string, durationMs: number }
- RunnerResult: { passed: boolean, steps: StepResult[], tracePath?: string, durationMs: number }

### Functions:
- executePlan(plan: SmokeStep[], options: { baseUrl: string, timeoutPerStepMs: number, outputDir: string }): Promise<RunnerResult>

### Smoke step implementations:
- navigate: page.goto(baseUrl + path), assert response status 200 (via response object)
- screenshot: page.screenshot({ path: outputDir/step-N.png, fullPage: false })
- assert_title: expect page title to not be empty and not contain 'Error'
- assert_visible: page.locator(selector).waitFor({ state: 'visible', timeout: timeoutPerStepMs })
- assert_200: already handled by navigate step; if called standalone, re-check response

### Behavior:
- Use Playwright Chromium only (no firefox/webkit in v1)
- Each step has its own try/catch — one failing step does not abort the rest
- Take a screenshot automatically on every failing step (even if not a screenshot step)
- Start a Playwright trace at run start; stop and save on failure
- Per-step timeout: timeoutPerStepMs (default 30000)
- Total run hard limit: enforced by the caller via Promise.race with a timeout

### Tests:
- Test against fixtures/preview-app (create a minimal Express app serving 3 routes for testing)
- Test: navigate to valid route → passed
- Test: navigate to non-existent route → failed with 404 message
- Test: assert_visible with missing selector → failed with timeout message
- Test: screenshot step → file exists at outputDir

## apps/browser-runner

Azure Container Apps Job (runs to completion and exits).

### Dockerfile:
- Base: mcr.microsoft.com/playwright:v1.44.0-jammy (use exact pinned version)
- Install Node 20, pnpm
- Copy packages/runner-playwright and packages/domain and packages/shared
- Entrypoint: node dist/index.js

### Entrypoint (index.ts):
- Read RUN_PLAN from env var (JSON string of SmokeStep[])
- Read BASE_URL, OUTPUT_DIR, STEP_TIMEOUT_MS, RUN_TIMEOUT_MS from env vars
- Read BLOB_CONNECTION_STRING and BLOB_CONTAINER from env vars
- Call executePlan() with a hard timeout via Promise.race
- Upload each artifact file to Azure Blob Storage:
  - Path pattern: runs/{runId}/{filename}
  - Return signed URL (SAS URL, 30-day expiry) for each artifact
- Write final RunnerResult + artifact URLs as JSON to stdout
- Exit 0 on success (even if tests failed — non-zero exit only on infrastructure failure)

### Terraform (infra/terraform/runner-job.tf):
- Define Azure Container Apps Job resource
- Image from Azure Container Registry
- Trigger type: Manual (orchestrator triggers it)
- CPU: 1.0, Memory: 2Gi
- Max retries: 1
- Timeout: 12 minutes

Definition of done: Trigger job manually against a live test URL → screenshots appear in Azure Blob Storage → RunnerResult JSON printed to stdout with correct pass/fail → SAS URLs are accessible.
```

**Exit check:**
- [ ] `executePlan` runs against `fixtures/preview-app` — all step types pass their tests
- [ ] Screenshot file created for every failing step
- [ ] Trace file created on failure
- [ ] Docker image builds successfully
- [ ] Job triggered manually → screenshots in Azure Blob Storage
- [ ] SAS URLs are accessible in browser

**Mark done:** [ ]

---

### Sprint 1.5 — Reporter + M1 Integration

**State check:** Sprints 1.3 and 1.4 both complete.

**Prompt:**
```
You are building Preview QA Agent.

Completed so far: all Phase 0 packages, webhook-api, github-adapter, vercel-adapter, orchestrator (up to preview resolution), runner-playwright, browser-runner.

Read these files:
- AGENTS.md
- docs/WORKFLOWS.md (reporting section, sticky comment policy, GitHub Check policy, example PR result comment)
- docs/ARCHITECTURE.md

Your job is Sprint 1.5 — build packages/reporter and wire the full pipeline end-to-end.

## packages/reporter

Generates GitHub-safe Markdown for PR comments and Check output. No external calls. Pure functions only.

### Functions:

- formatPRComment(result: RunSummary): string
  Produces a Markdown string matching this structure:
  ## Preview QA Result: {PASSED|FAILED|BLOCKED}
  - **Mode:** {mode}
  - **Preview:** {previewUrl}
  - **Head SHA:** {headSha} (first 7 chars)
  - **Executed:** {total} cases, {passed} passed, {failed} failed
  - **Status:** {outcome}
  ### Failure summary (if any failures)
  {failureSummary text}
  ### Evidence
  - Screenshot: [step-N.png]({url})
  - Trace: [trace.zip]({url}) (if present)
  ### Re-run
  Comment `/qa rerun` to run again or `/qa smoke` for a smoke-only run.
  <!-- previewqa-result -->

- formatCheckOutput(result: RunSummary): { title: string, summary: string, text: string }
  title: "Preview QA: PASSED" or "Preview QA: FAILED (2/4 cases)"
  summary: one-paragraph plain summary
  text: Markdown table of all step results

- formatParseErrorComment(errors: string[]): string
  Produces a friendly comment explaining the YAML parse errors with a link to docs/PR_INSTRUCTIONS_SPEC.md

- formatBlockedComment(reason: 'preview_timeout'|'fork_pr'|'quota_exceeded'): string

### Tests:
- Snapshot tests for all four formatters (use vitest snapshots)
- Test that <!-- previewqa-result --> marker always appears in PR comment output
- Test that formatParseErrorComment includes all error messages

## Wire the full pipeline in apps/orchestrator

After preview resolves → planning state → for now use a hardcoded default smoke plan:
[
  { type: 'navigate', value: '/' },
  { type: 'screenshot' },
  { type: 'assert_title' },
  { type: 'assert_200' }
]

Steps:
1. In orchestrator, after preview resolved: trigger Azure Container Apps Job with the smoke plan and preview URL
2. Poll the job until it completes (use Azure Container Apps Jobs API — check execution status every 10s)
3. Parse the RunnerResult from job stdout
4. Store result + artifact records in DB
5. Call packages/reporter formatPRComment and formatCheckOutput
6. Call packages/github-adapter upsertPRComment and updateCheck with the formatted output
7. Update run state to completed or failed

## Onboard one internal repo:
- Install the GitHub App on the repo
- Set VERCEL_TOKEN, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY in Azure Key Vault
- Open a test PR and confirm the full end-to-end flow runs

Definition of done (M1 — Internal Alpha):
- Open a real PR → smoke run executes → screenshot visible in PR comment → GitHub Check shows pass or fail
- Superseded SHA (push another commit) → old run cancels → new run starts
- /qa rerun in PR comment → new run starts
- All snapshot tests pass
```

**Exit check (M1):**
- [ ] Open real PR → sticky comment appears with result + screenshot link
- [ ] GitHub Check shows `success` or `failure`
- [ ] Push new commit → old run state is `canceled` in DB
- [ ] `/qa rerun` comment → new run created
- [ ] Screenshot SAS URL opens a real image
- [ ] All snapshot tests green

**Mark done:** [ ] ← **M1 — Internal Alpha closed**

---

## Phase 2 — Beta: Instruction-Driven

---

### Sprint 2.1 — Parser + YAML Validation

**State check:** M1 complete (Sprint 1.5 done).

**Prompt:**
```
You are building Preview QA Agent. M1 (Internal Alpha) is complete — the smoke loop works end-to-end.

Read these files:
- AGENTS.md
- docs/PR_INSTRUCTIONS_SPEC.md (read every section — this is the full contract)
- .github/PULL_REQUEST_TEMPLATE.md

Your job is Sprint 2.1 — build packages/parser.

## packages/parser

Extracts and validates the structured QA block from a PR description.

### parseInstructions(prBody: string): ParseResult

Where ParseResult is:
- { status: 'found', instructions: PRInstructions } — block found and valid
- { status: 'not_found' } — no markers in PR body
- { status: 'error', errors: string[] } — markers found but YAML invalid or schema invalid

### Implementation:
1. Find content between <!-- previewqa:start --> and <!-- previewqa:end --> using a regex
2. Strip the ```yaml ``` fencing if present
3. Parse YAML using the `js-yaml` library (add as dependency)
4. Validate against PRInstructionSchema from packages/schemas
5. On schema failure: collect all Zod errors and format them as human-readable strings, e.g.:
   "test_cases is required when mode is 'instruction'"
   "test_cases[0].name: required"
   "mode: must be one of skip, smoke, instruction, hybrid, full"

### Error comment formatter (add to packages/reporter):
- formatParseErrorComment(errors: string[]): string
  Posts a helpful comment to the PR explaining what's wrong.
  Must include:
  - list of errors
  - link to the PR template (suggest they copy from .github/PULL_REQUEST_TEMPLATE.md)
  - note that smoke mode will run as fallback

### Wire into orchestrator:
After preview resolved and run enters planning state:
1. Fetch PR description using github-adapter getPRMetadata
2. Call parser.parseInstructions(description)
3. If 'not_found': log, proceed with default smoke plan
4. If 'error': call reporter.formatParseErrorComment, post to PR via github-adapter, proceed with smoke
5. If 'found': store parsed instructions on plan record, proceed to planner (stub for now — just log the plan)

### Golden fixture tests (required):
Create fixtures/parser/ with at least:
- valid-smoke.yaml — mode: smoke
- valid-instruction.yaml — mode: instruction with test_cases
- valid-hybrid.yaml — mode: hybrid with test_cases  
- valid-skip.yaml — mode: skip
- invalid-missing-test-cases.yaml — mode: instruction, no test_cases → expect error
- invalid-bad-mode.yaml — mode: badmode → expect error
- invalid-malformed-yaml — broken YAML syntax → expect error
- invalid-secret-in-body — contains "password:" plaintext → expect error or warning
- missing-markers — no markers → expect not_found
- markers-with-no-yaml — empty block → expect error

Each fixture must have a corresponding .expected.json showing the exact ParseResult.
Tests must assert exact match.

Definition of done: All 10 golden fixtures pass. PR with valid YAML block → parser returns correct instructions. PR without block → smoke fallback. PR with invalid block → error comment posted to real PR.
```

**Exit check:**
- [ ] All 10 golden fixture tests pass exactly
- [ ] `parse.not_found` → smoke runs silently
- [ ] `parse.error` → error comment posted to real PR with clear guidance
- [ ] `parse.found` → instructions logged in orchestrator
- [ ] Snapshot test for parse error comment format

**Mark done:** [ ]

---

### Sprint 2.2 — AI Package

**State check:** Sprint 0.4 complete. Can run parallel with Sprint 2.1.

**Prompt:**
```
You are building Preview QA Agent.

Read these files:
- AGENTS.md
- docs/ARCHITECTURE.md (model usage strategy section)
- docs/WORKFLOWS.md (failure taxonomy)

Your job is Sprint 2.2 — build packages/ai.

## packages/ai

Wraps Azure OpenAI. All prompt templates are defined here. No prompts anywhere else in the codebase.

### Setup:
- Use @azure/openai SDK
- Model deployment names come from config ONLY — never hardcoded:
  - AZURE_OPENAI_ENDPOINT
  - AZURE_OPENAI_HIGH_CAP_DEPLOYMENT (e.g. gpt-4o)
  - AZURE_OPENAI_LOW_CAP_DEPLOYMENT (e.g. gpt-4o-mini)
- All calls must log to model_trace table in DB:
  { promptName, inputTokens, outputTokens, modelDeployment, latencyMs, runId }

### Prompts to implement:

#### 1. planNormalizer(input: { rawStep: string, baseUrl: string }): Promise<NormalizedStep>
Converts a human-written step string from the YAML into a structured Playwright step.
System prompt: You convert PR test instructions into structured browser automation steps...
Input: { rawStep: "click the save button in the billing form", baseUrl: "https://..." }
Output: { type: 'click', selector: '[data-testid=save-button]', fallbackSelector: 'button:has-text("Save")', confidence: 'high'|'medium'|'low' }
Use LOW_CAP model.

#### 2. failureSummarizer(input: { stepResults: StepResult[], testCaseName: string, previewUrl: string }): Promise<string>
Generates a 2-3 sentence human-readable summary of what failed and why.
Example output: "The checkout confirmation toast did not appear after clicking the submit button on the billing page. The element [data-testid=confirmation-toast] was not visible within 30 seconds. This may indicate the form submission handler is not triggering the toast state update."
Use HIGH_CAP model.

#### 3. riskClassifier(input: { stepResults: StepResult[], failureSummary: string }): Promise<FailureCategory>
Classifies the failure using the FailureCategory enum from packages/domain.
Use LOW_CAP model. Return the enum value directly.

### Golden fixture tests (required):
- Create fixtures/ai/ directory
- For each prompt: 3 sample inputs with expected outputs
- Tests mock the Azure OpenAI API (do not make real API calls in tests)
- Test that model names are never hardcoded (grep for literal model name strings — must not exist outside config)
- Test that model_trace record is written for every prompt call

Definition of done: All three prompts callable. Golden fixtures pass. model_trace rows written to DB after each call. No model name strings hardcoded anywhere.
```

**Exit check:**
- [ ] All 3 prompts callable and return correct TypeScript types
- [ ] `model_trace` row written to DB for every call
- [ ] No model name string hardcoded — only env var references
- [ ] All fixture tests pass with mocked API
- [ ] `pnpm typecheck` passes

**Mark done:** [ ]

---

### Sprint 2.3 — Planner + Instruction Mode

**State check:** Sprints 2.1 and 2.2 complete.

**Prompt:**
```
You are building Preview QA Agent. Parser (2.1) and AI package (2.2) are complete.

Read these files:
- AGENTS.md
- docs/WORKFLOWS.md (plan generation section, modes)
- docs/PR_INSTRUCTIONS_SPEC.md (step patterns)
- docs/ARCHITECTURE.md

Your job is Sprint 2.3 — build packages/planner and wire instruction mode end-to-end.

## packages/planner

Converts validated PRInstructions into an executable Plan stored in DB.

### createPlan(input: { runId: string, instructions: PRInstructions | null, mode: RunMode, baseUrl: string }): Promise<Plan>

Logic:
- mode === 'smoke' OR instructions === null:
  → return default smoke plan (navigate /, screenshot, assert_title, assert_200)
- mode === 'instruction':
  → call normalizeInstructions(instructions.test_cases) to convert each step string
  → return plan with only explicit test cases
- mode === 'hybrid':
  → call normalizeInstructions(instructions.test_cases)
  → append default smoke steps to the end
  → return combined plan

### normalizeInstructions(testCases: TestCase[]): Promise<NormalizedTestCase[]>
- For each step string in each test case, call packages/ai planNormalizer
- If planNormalizer returns confidence: 'low', flag the step with needs_review: true
- If planNormalizer fails: keep the raw step string and flag as needs_review: true
- Never fail the whole plan because one step normalization fails

### DB writes:
- Write a plan record (run_id, mode, created_at, status: 'ready')
- Write a test_case record for each normalized case (plan_id, name, priority, steps JSON, assertions JSON)

### Tests:
- Unit test: smoke mode → default plan returned
- Unit test: instruction mode → only explicit test cases
- Unit test: hybrid mode → explicit + smoke appended
- Unit test: planNormalizer 'low' confidence → step flagged as needs_review
- Golden fixture: fixtures/planner/ with 3 PRInstructions inputs → expected Plan outputs

## Wire into orchestrator:
After parsing → call planner.createPlan → store plan/test_case records → trigger browser-runner with the full plan (not just hardcoded smoke steps) → reporter uses full results.

Definition of done: PR with instruction mode QA block → planner creates test_case records for each explicit step → runner executes them → reporter shows step-level results in PR comment.
```

**Exit check:**
- [ ] `smoke` mode → 4 default smoke test cases in DB
- [ ] `instruction` mode → only explicit test cases, no smoke steps appended
- [ ] `hybrid` mode → explicit + smoke steps both present
- [ ] `model_trace` rows written for each `planNormalizer` call
- [ ] PR with instruction YAML → test cases visible in DB → results in PR comment

**Mark done:** [ ]

---

### Sprint 2.4 — PR Commands + Auth Profiles

**State check:** Sprint 2.3 complete.

**Prompt:**
```
You are building Preview QA Agent. Planner and instruction mode are working.

Read these files:
- AGENTS.md
- docs/WORKFLOWS.md (PR comment commands section, human-in-the-loop rules)
- docs/OPERATIONS_AND_SECURITY.md (secrets rules, fork PR policy)

Your job is Sprint 2.4 — implement PR commands, auth profiles, and complete M2.

## Part 1: PR Commands (in apps/webhook-api and apps/orchestrator)

Commands to support in v1:
- /qa rerun — cancel current active run for this PR, create new run with current mode
- /qa smoke — create new run with mode=smoke regardless of QA block
- /qa help — post help comment listing available commands
- /qa skip — mark PR as intentionally skipped (do not run QA)

In apps/webhook-api (already has issue_comment handler):
- Parse comment body, detect /qa commands (case-insensitive, must be first non-whitespace on line)
- Verify commenter is a repo collaborator using github-adapter (add: isCollaborator(installationId, owner, repo, username): Promise<boolean>)
- If not a collaborator: do nothing (no error comment — do not leak membership info)
- Enqueue RunCommandMessage with the parsed command

In apps/orchestrator (handleRunCommand):
- /qa rerun: fetch latest run for PR, cancel it, re-enqueue as new RunCreatedMessage with same mode
- /qa smoke: enqueue new RunCreatedMessage with mode=smoke
- /qa help: call reporter.formatHelpComment(), post to PR via github-adapter
- Rate limit: max 5 command executions per PR per hour (check audit_event table)

Add formatHelpComment() to packages/reporter.

## Part 2: Auth Profiles (in apps/browser-runner and packages/runner-playwright)

Login profiles allow named credentials to be referenced in YAML without putting secrets in the PR.

In apps/browser-runner:
- Read LOGIN_PROFILE from env var (optional)
- If set: fetch the secret from Azure Key Vault using the profile name
  - Key Vault secret name pattern: previewqa-profile-{profileName}
  - Secret value is a JSON string of Playwright storageState
- Write storageState JSON to a temp file
- Pass storageStatePath to packages/runner-playwright

In packages/runner-playwright executePlan:
- Accept optional storageStatePath in options
- If present: pass to browser context: await browser.newContext({ storageState: storageStatePath })
- This pre-authenticates the browser session

## Part 3: M2 validation

Run the full M2 exit checklist:
- Open a PR with a valid instruction mode QA block → explicit test cases run → result in PR
- Open a PR with an invalid QA block → parse error comment posted → smoke fallback runs
- Open a PR with hybrid mode → both explicit and smoke steps run
- Post /qa rerun → new run starts
- Post /qa smoke → smoke-only run starts (ignores QA block)
- Post /qa help → help comment posted
- Post /qa rerun as a non-collaborator → command silently ignored
- Auth profile test: PR with login_profile set → Key Vault secret fetched → storageState applied

Definition of done (M2 — Internal Beta): All items above verified on a real GitHub repo.
```

**Exit check:**
- [ ] `/qa rerun` → new run visible in DB with new `run_id`
- [ ] `/qa smoke` → run with `mode=smoke` regardless of QA block
- [ ] `/qa help` → help comment posted
- [ ] Non-collaborator command → silently ignored
- [ ] Rate limit enforced (6th command in 1 hour → blocked)
- [ ] Auth profile → storageState applied to browser context
- [ ] All M2 checklist items verified on real PR

**Mark done:** [ ] ← **M2 — Internal Beta closed**

---

## Phase 3 — Hardening

---

### Sprint 3.1 — Fork Policy + Input Security

**State check:** M2 complete. Run parallel with 3.2 and 3.3.

**Prompt:**
```
You are building Preview QA Agent. M2 is complete.

Read these files:
- AGENTS.md
- docs/OPERATIONS_AND_SECURITY.md (fork PR policy, prompt and input safety, browser runner isolation)
- docs/WORKFLOWS.md (human-in-the-loop rules)

Your job is Sprint 3.1 — implement fork PR security policy and input sanitization. This is non-negotiable for launch.

## Fork PR Policy (in apps/orchestrator)

In handleRunCreated, immediately after loading PR metadata:

1. Check isFork from github-adapter getPRMetadata
2. If isFork is true:
   - If mode would require authentication (login_profile is set in instructions): downgrade to smoke, clear login_profile
   - If repo config has fork_policy: 'block': update run state to blocked_environment, post formatBlockedComment('fork_pr'), return
   - Otherwise: proceed with unauthenticated smoke only, add note to PR comment that auth was skipped

3. Write audit_event to DB for every fork policy decision:
   { runId, installationId, repositoryId, prNumber, headSha, eventType: 'fork_policy_applied', details: { originalMode, downgraded: boolean, blocked: boolean } }

Integration test (required):
- Mock a fork PR payload (head.repo.fork = true)
- Mode=instruction with login_profile → should proceed as smoke with login_profile cleared
- Verify audit_event written
- Verify PR comment notes that auth was skipped

## Input Sanitization

All untrusted text that reaches the LLM must be sanitized first.

In packages/ai, before passing any user content to prompts:
- Strip content between <script> tags
- Remove <!-- --> HTML comments
- Truncate to max 4000 characters per field
- Never include: PR author's personal details, commit messages, diff content unless explicitly part of the prompt design

In apps/orchestrator, before passing PR body to parser:
- Truncate PR body to 10000 characters max
- Log a warning if truncated

In packages/reporter, before posting any comment:
- Scan for patterns that look like secrets (regex for: ghp_, sk-, AKIA, ey[a-zA-Z0-9], patterns like 40-char hex)
- If found: replace with [REDACTED] and log a warning with the run ID

Tests:
- Unit test: fork PR with login_profile → login_profile cleared, audit_event written
- Unit test: reporter comment with mock token pattern → token replaced with [REDACTED]
- Unit test: PR body > 10000 chars → truncated, warning logged

Definition of done: Fork PR triggers correct policy. Secrets never appear in posted PR comments. Audit trail exists for every fork policy decision.
```

**Exit check:**
- [ ] Fork PR + auth profile → `login_profile` cleared, smoke runs, note in PR comment
- [ ] `audit_event` row written for every fork decision
- [ ] Reporter replaces token-shaped strings with `[REDACTED]`
- [ ] PR body > 10000 chars → truncated with warning log
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 3.2 — Retry, Timeouts, Failure Classification

**State check:** M2 complete. Run parallel with 3.1 and 3.3.

**Prompt:**
```
You are building Preview QA Agent. M2 is complete.

Read these files:
- AGENTS.md
- docs/WORKFLOWS.md (retry policy, failure taxonomy, cancellation rules)

Your job is Sprint 3.2 — implement retry policy, per-run timeouts, and failure classification.

## Retry Policy (in apps/orchestrator)

Transient errors that should retry (max 3 attempts, exponential backoff: 5s, 15s, 45s):
- Azure Container Apps Job API 5xx error
- Service Bus transient failure
- GitHub API 503 or rate limit (429)
- Vercel API 5xx

Never retry:
- GitHub API 4xx (not rate limit) — these are caller errors
- Parser schema errors
- Fork policy blocks
- Run state: needs_human

Implementation:
- Add withRetry<T>(fn: () => Promise<T>, options: { maxAttempts: number, isRetryable: (err: unknown) => boolean, backoffMs: number[] }): Promise<T>
- Use it in orchestrator for job trigger, GitHub API calls, Vercel API calls
- Log each retry attempt with { attempt, error, nextRetryInMs }

## Per-Run Timeouts

In apps/orchestrator, the full run has a hard time limit (DEFAULT_RUN_TIMEOUT_MS from packages/domain = 600_000ms).
- Wrap the full handleRunCreated pipeline in a Promise.race with a timeout
- On timeout: update run state to failed, post comment explaining timeout, update GitHub Check

In apps/browser-runner:
- The job itself already has a 12-minute Terraform-level timeout (Azure kills the container)
- Additionally: enforce inside the process using Promise.race on executePlan vs. a timeout

## Failure Classification (wire packages/ai riskClassifier)

After browser-runner completes with failures:
1. Call packages/ai failureSummarizer → get summary string
2. Call packages/ai riskClassifier → get FailureCategory
3. Store on result record in DB
4. Pass to packages/reporter — reporter must show the category distinctly:
   - product_bug: "⚠️ Likely product bug" (bold, prominent)
   - test_bug: "🔧 Possible test issue — selector or logic may need updating"
   - environment_issue: "🌐 Environment issue — preview may be unstable"
   - flaky: "🔁 Flaky result — retried and still failed"
   - needs_clarification: "❓ Instructions unclear — please update QA block"

Tests:
- Unit test withRetry: retries up to maxAttempts, does not retry non-retryable errors
- Unit test run timeout: pipeline exceeds timeout → run state = failed, comment posted
- Unit test failure classification: each FailureCategory renders correct label in comment (snapshot test)

Definition of done: Simulated job failure retries 3 times then fails. Simulated timeout → run state failed, comment posted. Failure categories render correctly in reporter.
```

**Exit check:**
- [ ] Transient error → retried up to 3 times (visible in logs)
- [ ] Non-retryable 4xx → not retried
- [ ] Run exceeds timeout → `failed` state, comment posted
- [ ] `product_bug` classification → "⚠️ Likely product bug" in PR comment
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 3.3 — Observability

**State check:** M2 complete. Run parallel with 3.1 and 3.2.

**Prompt:**
```
You are building Preview QA Agent. M2 is complete.

Read these files:
- AGENTS.md
- docs/OPERATIONS_AND_SECURITY.md (observability section, SLIs/SLOs, alerting)

Your job is Sprint 3.3 — build packages/observability and wire it across all components.

## packages/observability

### Logger (Pino)
- createLogger(context: { service: string }): Logger
- Every log call must accept extra fields: { runId?, installationId?, repositoryId?, prNumber?, headSha? }
- Log level from LOG_LEVEL env var (default: info)
- Output: structured JSON only — no pretty print in production

### OpenTelemetry
- initTracing(serviceName: string): void — call once at app startup
- withSpan<T>(name: string, fn: (span: Span) => Promise<T>, attributes?: Record<string, string>): Promise<T>
- Correlation ID: generateCorrelationId(): string — attach to every Service Bus message envelope and pass through

### Metrics (custom App Insights events)
- recordRunCompleted({ runId, mode, durationMs, outcome: 'passed'|'failed'|'blocked' }): void
- recordPreviewResolution({ runId, durationMs, result: 'found'|'timeout'|'error' }): void
- recordFalseFailure({ runId, category: FailureCategory }): void (called when category is environment_issue or flaky)

## Wire across all apps

In apps/webhook-api: initTracing('webhook-api'). Log every inbound event with { eventType, installationId, correlationId }.
In apps/orchestrator: initTracing('orchestrator'). Wrap every state transition in a withSpan. Pass correlationId through all Service Bus messages.
In apps/browser-runner: initTracing('browser-runner'). Wrap executePlan in a withSpan. Log each step result.

## App Insights dashboards (Terraform)

Add to infra/terraform/monitoring.tf:
- App Insights resource (already exists from Sprint 0.1)
- Workbook with two tabs:
  Tab 1 "Operations": active runs by state (KQL), queue depth (KQL), error rate last 1h
  Tab 2 "Product Health": runs/day (7-day bar chart), mode breakdown (pie), false failure rate line

## Alert rules (App Insights)

Create 8 alert rules in Terraform:
1. Webhook signature failures > 10 in 1 hour → severity 2
2. Preview resolution failure rate > 20% over 1 hour → severity 2
3. Runner crash 3 consecutive times (same runId) → severity 1
4. Artifact upload failures > 5% over 1 hour → severity 2
5. Key Vault access failures > 0 in 5 minutes → severity 1
6. Service Bus queue depth > 50 messages → severity 2
7. Run timeout rate > 15% over 1 hour → severity 2
8. Rerun commands > 20 per repo per hour → severity 3

Tests:
- Unit test: logger always includes service name in output
- Unit test: withSpan calls fn and returns result
- Unit test: recordRunCompleted emits correct App Insights event shape

Definition of done: End-to-end run produces a correlated OTEL trace visible in App Insights. All 8 alert rules exist in Azure (verify via Terraform plan output). Logger outputs structured JSON on all three apps.
```

**Exit check:**
- [ ] End-to-end run trace visible in App Insights with correlated spans
- [ ] Every log line has `runId` and `correlationId`
- [ ] All 8 alert rules exist in Azure
- [ ] App Insights workbook shows runs/day data
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 3.4 — Cost Controls + Retention

**State check:** Sprint 3.3 complete.

**Prompt:**
```
You are building Preview QA Agent. Observability is wired.

Read: docs/OPERATIONS_AND_SECURITY.md (cost controls, data retention sections).

Your job is Sprint 3.4 — implement cost controls, concurrency limits, and retention policies.

## Cost controls (in apps/orchestrator)

1. Per-installation concurrency cap:
   - Before starting a new run: count active runs (state in [waiting_for_preview, planning, running, analyzing]) for this installation
   - If count >= installation.concurrency_limit (default 5): post formatBlockedComment('quota_exceeded') and set run state to blocked_environment

2. Per-PR rerun rate limit: already done in Sprint 2.4 (max 5/hour). Verify it's in place.

3. Max test cases per run: in packages/planner, if normalized plan has > MAX_TEST_CASES_PER_RUN (20): truncate to 20 and log a warning in the PR comment.

4. Video capture policy: in apps/browser-runner, only record video if:
   - RUN_MODE env var is 'debug', OR
   - A step fails (use Playwright's on-demand video via page.video() path after failure)

## Artifact retention (Azure Blob Storage lifecycle rules in Terraform)

Add lifecycle management policy to infra/terraform/storage.tf:
- screenshots/: delete after 30 days
- traces/: delete after 14 days
- videos/: delete after 14 days
- logs/: delete after 30 days

## DB retention (scheduled cleanup in apps/orchestrator)

Add a scheduled task that runs daily (use setInterval or a cron-like mechanism):
- Delete run records older than 90 days (cascade deletes plan, test_case, result, artifact, comment_record)
- Delete model_trace records older than 30 days
- Delete audit_event records older than 90 days
- Log count of deleted records

Tests:
- Unit test: 6th concurrent run for same installation → blocked_environment state, comment posted
- Unit test: plan with 25 test cases → truncated to 20, warning in comment
- Unit test: DB cleanup deletes records older than retention period (mock date)

Definition of done: Concurrency cap enforced (6th run blocked). Plan truncated at 20 cases. Blob lifecycle rules in Terraform apply output. Daily cleanup scheduled and logs row counts.
```

**Exit check:**
- [ ] 6th concurrent run → `blocked_environment`, comment posted
- [ ] 25-case plan → truncated to 20 in DB
- [ ] Blob lifecycle rules in `terraform plan` output
- [ ] Daily cleanup scheduled and logged
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 3.5 — Design Partner Onboarding + M3

**State check:** Sprints 3.1–3.4 all complete. HUMAN sprint.

**Actions to take yourself:**
1. Onboard 3 external repos (design partners). Walk each through:
   - Installing the GitHub App
   - Adding the PR template to their repo
   - Creating a `.previewqa/config.yaml`
   - Opening a test PR to verify the first run
2. Write 5 operational runbooks in `docs/runbooks/`:
   - `preview-not-found.md`
   - `runner-crash.md`
   - `github-auth-failure.md`
   - `vercel-token-failure.md`
   - `queue-stuck.md`
3. Monitor for 1 full week: false failure rate, preview resolution rate, run duration.
4. Publish GitHub App to GitHub Marketplace (free tier).

**Exit check (M3 — Private Beta):**
- [ ] 3 external repos onboarded and running real PRs
- [ ] False failure rate < 5% across all runs
- [ ] Preview resolution success > 90%
- [ ] All 5 runbooks written and reviewed
- [ ] 8 App Insights alert rules firing correctly
- [ ] GitHub App listed on GitHub Marketplace

**Mark done:** [ ] ← **M3 — Private Beta closed**

---

## Phase 4 — Repo-Aware Intelligence

---

### Sprint 4.1 — Changed-File Heuristics

**State check:** M3 complete. Runs parallel with 4.2, 4.3, 4.4.

**Prompt:**
```
You are building Preview QA Agent. M3 (Private Beta) is complete.

Read: AGENTS.md, docs/ARCHITECTURE.md (repo-aware intelligence section), planning/02-DEVELOPMENT-ROADMAP.md (Phase 4).

Your job is Sprint 4.1 — implement changed-file heuristics to improve plan quality.

## New package: packages/diff-analyzer

### getDiffContext(params: { installationId, owner, repo, prNumber, headSha }): Promise<DiffContext>
- Fetch PR diff using GitHub API (GET /repos/{owner}/{repo}/pulls/{prNumber}/files)
- Return:
  { changedFiles: string[], affectedRoutes: string[], affectedComponents: string[], riskLevel: 'low'|'medium'|'high' }

### Route mapping heuristics:
- File in app/ or pages/ or src/pages/ → extract route path (strip file extension, handle index files)
  e.g. app/dashboard/page.tsx → /dashboard
  e.g. pages/billing/index.tsx → /billing
- File in components/ or src/components/ → extract component name
- File in api/ or src/api/ or app/api/ → mark as API change, note route but do not add browser smoke for it
- riskLevel: high if > 5 files changed or any changed file is in auth/, billing/, checkout/

### Wire into apps/orchestrator:
After parsing instructions, before calling planner:
1. Call getDiffContext
2. Pass DiffContext to planner.createPlan as an additional argument

### Wire into packages/planner:
In createPlan, after building the plan:
- For each affectedRoute not already covered by an explicit test case or smoke step: append an additional navigate step for that route
- Cap total steps at MAX_TEST_CASES_PER_RUN — drop lowest priority first

Tests:
- Unit test: app/dashboard/page.tsx → affectedRoutes includes /dashboard
- Unit test: pages/billing/index.tsx → /billing
- Unit test: api/payments.ts → route extracted but no browser smoke added
- Unit test: 10 affected routes + 15 existing steps → capped at 20 total
- Fixture: a realistic PR touching 3 routes → plan includes smoke checks for those routes

Definition of done: PR touching app/login/page.tsx → plan includes a smoke check for /login automatically.
```

**Exit check:**
- [ ] `app/dashboard/page.tsx` → `/dashboard` added to plan
- [ ] API-only changes → no extra browser steps added
- [ ] Total steps never exceed 20
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 4.2 — AI Plan Suggestions

**State check:** Sprint 4.1 complete.

**Prompt:**
```
You are building Preview QA Agent. Changed-file heuristics (4.1) are complete.

Read: AGENTS.md, planning/02-DEVELOPMENT-ROADMAP.md (Phase 4).

Your job is Sprint 4.2 — AI-assisted plan suggestions posted as informational PR comments.

## New prompt in packages/ai:

### planSuggester(input: { diffContext: DiffContext, existingPlan: Plan, mode: RunMode }): Promise<PlanSuggestion[]>

Where PlanSuggestion is: { route: string, reason: string, suggestedStep: string }

System prompt goal: Given what changed in this PR and what is already being tested, identify any important user flows that are not being tested. Suggest 1-3 additional test steps. Be conservative — only suggest when there is clear evidence of a missing important flow.

Rules for the prompt:
- Do not suggest steps for API-only changes
- Do not suggest duplicates of existing test cases
- Max 3 suggestions
- If nothing meaningful to suggest: return empty array
Use LOW_CAP model.

## New formatter in packages/reporter:

### formatSuggestionsComment(suggestions: PlanSuggestion[]): string
If suggestions is empty: return null (do not post)
Otherwise: post an informational comment (not blocking):
💡 Preview QA Suggestions
The following flows might be worth adding to your QA block:
- /checkout: "The checkout flow touches the pricing component — consider adding a checkout completion test"
  Suggested step: goto /checkout → click [data-testid=checkout-button] → expect text "Order confirmed" visible

## Wire into apps/orchestrator:
After creating the plan, if suggestions exist:
- Post suggestions comment via github-adapter (separate from the result sticky comment)
- Do not block the run on suggestions

## Golden fixtures:
- fixtures/ai/suggestions/ — 3 PR scenarios with expected suggestion outputs
- Test that empty suggestions → no comment posted

Definition of done: PR touching /checkout → suggestion comment posted. Existing test case for /checkout → no suggestion posted (not duplicated).
```

**Exit check:**
- [ ] PR with uncovered route → suggestion comment posted
- [ ] PR with all routes covered → no suggestion comment
- [ ] Suggestions never duplicate existing test cases
- [ ] Golden fixtures pass

**Mark done:** [ ]

---

### Sprint 4.3 — pgvector Retrieval

**State check:** Sprint 4.2 complete.

**Prompt:**
```
You are building Preview QA Agent. AI plan suggestions (4.2) are complete.

Read: AGENTS.md, docs/ARCHITECTURE.md (pgvector section).

Your job is Sprint 4.3 — add semantic retrieval of past runs using pgvector.

## Setup:
- Enable pgvector extension on the PostgreSQL instance: CREATE EXTENSION IF NOT EXISTS vector;
- Add migration: alter model_trace to add embedding vector(1536) column (nullable)
- Add migration: create run_embeddings table { id, run_id, content_type: 'summary'|'failure'|'plan', embedding vector(1536), created_at }

## In packages/ai:

### embedText(text: string): Promise<number[]>
- Call Azure OpenAI embeddings endpoint (model: text-embedding-3-small, 1536 dimensions)
- Log to model_trace

### findSimilarRuns(params: { embedding: number[], repositoryId: string, limit: number }): Promise<RunSummary[]>
- SELECT run_id, content_type, 1 - (embedding <=> $1::vector) AS similarity FROM run_embeddings WHERE repository_id = $2 ORDER BY similarity DESC LIMIT $3
- Return top-N with similarity > 0.7

## Wire into apps/orchestrator:
After a run completes with failures:
1. Embed the failure summary text
2. Store embedding in run_embeddings
3. Before calling failureSummarizer: retrieve top 3 similar past runs
4. Pass past run summaries as context in the failureSummarizer prompt

## Tests:
- Unit test: findSimilarRuns returns results ordered by similarity (mock vector responses)
- Unit test: embedding stored after failed run
- Integration test: store 3 embeddings, query by similar text, assert correct ordering

Definition of done: After a failed run, embedding stored in DB. On next similar failure, past failure summary included in AI context (visible in model_trace log).
```

**Exit check:**
- [ ] `run_embeddings` table exists with `vector(1536)` column
- [ ] Embedding written to DB after every failed run
- [ ] `findSimilarRuns` returns correct ordering on mock data
- [ ] Similar past failure visible in `model_trace` context field

**Mark done:** [ ]

---

### Sprint 4.4 — Prompt Regression Test Suite

**State check:** Sprint 4.3 complete.

**Prompt:**
```
You are building Preview QA Agent. All Phase 4 intelligence features are complete.

Read: AGENTS.md.

Your job is Sprint 4.4 — build a comprehensive prompt regression test suite that runs in CI.

## What to build:

### Golden fixture library: fixtures/ai-regression/

For each prompt (planNormalizer, failureSummarizer, riskClassifier, planSuggester):
- Minimum 5 input/output pairs
- Store inputs as JSON files: fixtures/ai-regression/{promptName}/{n}.input.json
- Store expected outputs as JSON files: fixtures/ai-regression/{promptName}/{n}.expected.json

Selection criteria for fixtures:
- Include at least 1 edge case (empty input, ambiguous step, malformed selector)
- Include at least 1 case that should return a 'low confidence' or 'no suggestions' result
- Include at least 1 real-world-style case from actual internal QA runs

### Regression test runner:
- Tests in packages/ai/__tests__/regression.test.ts
- For each fixture pair: call the prompt with the input (using mocked Azure OpenAI that returns the fixture expected output) and assert the output matches expected exactly
- CI job: runs regression tests before any prompt or model config change is merged

### CI gate:
- Add a 'regression' job to .github/workflows/ci.yml
- This job: runs all AI regression tests
- If any fixture fails: CI fails with a diff showing expected vs actual
- Add a note in AGENTS.md: "All prompt changes require updating the relevant regression fixtures and passing the regression CI job"

## Additional quality check:
- Write a test that greps the entire codebase for Azure OpenAI model name strings
- Any hardcoded model name (not from env var) must fail this test

Definition of done: All regression fixtures pass in CI. Intentionally breaking one prompt output causes CI failure. Zero hardcoded model names found by the grep test.
```

**Exit check:**
- [ ] ≥ 5 fixtures per prompt, all passing
- [ ] Intentionally broken fixture → CI fails with clear diff
- [ ] Hardcoded model name grep test runs in CI
- [ ] `pnpm test` green

**Mark done:** [ ]

---

## Phase 5 — Launch Readiness

---

### Sprint 5.1 — Multi-Tenancy + Rate Limiting

**State check:** M3 complete. Runs parallel with 5.2 and 5.3.

**Prompt:**
```
You are building Preview QA Agent. M3 is complete with 3+ external repos running.

Read: AGENTS.md, docs/OPERATIONS_AND_SECURITY.md, planning/05-PRICING-AND-MONETIZATION.md.

Your job is Sprint 5.1 — multi-tenant isolation, rate limiting, and quota enforcement.

## DB changes:
- Add to installation table: tier enum (free, starter, growth, team, enterprise), monthly_run_count int, run_count_reset_at timestamp, concurrency_limit int, max_repos int, stripe_customer_id text (nullable), stripe_subscription_id text (nullable)
- Migration to add these columns with defaults matching Free tier limits

## Quota enforcement (in apps/orchestrator):

In handleRunCreated, after creating run record, before doing any work:
1. Load installation record
2. Check monthly_run_count >= tier limit (Free=50, Starter=500, Growth=3000, Team=10000)
3. If over limit: set run state to blocked_environment, post formatBlockedComment('quota_exceeded') with upgrade CTA link, update GitHub Check, return
4. Increment monthly_run_count atomically (UPDATE installation SET monthly_run_count = monthly_run_count + 1 WHERE id = $1)

Monthly reset: in the daily cleanup job (Sprint 3.4), also reset monthly_run_count where run_count_reset_at < now() - interval '30 days'.

## Cross-tenant isolation:
- Audit every DB query in packages/db: every query that touches run, plan, test_case, result, artifact must include installation_id in the WHERE clause
- Add a lint rule or test that asserts: no query in packages/db omits installation_id filter on tenant-scoped tables

## Noisy tenant protection:
- Per-installation concurrent run cap already done (Sprint 3.4)
- Add: if any single installation consumes > 50% of Service Bus queue messages in a 5-minute window, log an alert event (for manual review — do not auto-block yet)

## Upgrade CTA in PR comment:
- In formatBlockedComment('quota_exceeded'): include a link to the pricing page
- Include the current tier and limit: "You've used 50/50 runs this month on the Free plan."

Tests:
- Unit test: 51st run on Free tier → blocked, comment with upgrade CTA posted
- Unit test: monthly_run_count increments atomically
- Unit test: DB query without installation_id filter → caught by lint/test
- Integration test: two installations, each at their limit, do not interfere with each other

Definition of done: Free tier installation hits 50 runs → 51st blocked with CTA. Paid tier installation runs independently. All DB queries have installation_id filter.
```

**Exit check:**
- [ ] 51st run on Free tier → `blocked_environment`, upgrade CTA in comment
- [ ] Two installations' quotas are independent
- [ ] All tenant-scoped DB queries have `installation_id` filter (grep test passes)
- [ ] All unit tests green

**Mark done:** [ ]

---

### Sprint 5.2 — Stripe Billing Integration

**State check:** Sprint 5.1 complete.

**Prompt:**
```
You are building Preview QA Agent. Multi-tenancy and quota enforcement are complete.

Read: planning/05-PRICING-AND-MONETIZATION.md (full pricing tiers, overage billing, Stripe plan).

Your job is Sprint 5.2 — Stripe billing integration.

## Setup:
- Add stripe package
- Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to packages/config and .env.example
- Create Stripe products and prices (document in infra/stripe-setup.md as manual setup steps):
  - Product: Preview QA Agent
  - Prices: Free ($0), Starter ($29/mo), Growth ($99/mo), Team ($299/mo)
  - Metered price for overage runs: $0.02 per run (attached to Growth and Team)

## New app: apps/billing-api (or add to webhook-api as additional Function)

### POST /api/stripe/webhook
- Validate Stripe webhook signature (stripe.webhooks.constructEvent)
- Handle events:
  - customer.subscription.created → update installation.tier based on price ID
  - customer.subscription.updated → update installation.tier
  - customer.subscription.deleted → downgrade installation to Free tier
  - invoice.payment_failed → log, send alert (do not immediately downgrade — 7-day grace period)

### POST /api/billing/create-checkout-session (called from dashboard)
- Create Stripe Checkout session for a given price ID and installation
- Return session URL

### POST /api/billing/create-portal-session
- Create Stripe Customer Portal session for self-serve cancellation/upgrade/downgrade

## Overage billing:
- For Growth and Team: use Stripe metered billing
- After each run completes: if installation.monthly_run_count > tier_included_runs, report 1 unit to Stripe metered price via stripe.subscriptionItems.createUsageRecord
- Cap overage at 2x included runs by default (configurable per installation)

## Tests:
- Unit test: subscription.created event → installation.tier updated correctly for each price ID
- Unit test: subscription.deleted → installation.tier = 'free'
- Unit test: overage run reported to Stripe (mock Stripe SDK)
- Unit test: invalid Stripe webhook signature → 401

Definition of done: Stripe subscription event updates installation tier in DB. Checkout session creation returns a valid Stripe URL. Overage run reports usage to Stripe metered price.
```

**Exit check:**
- [ ] `customer.subscription.created` webhook → `installation.tier` updated in DB
- [ ] `customer.subscription.deleted` → downgraded to `free`
- [ ] Checkout session URL returned correctly
- [ ] Overage usage reported to Stripe (mock test)
- [ ] Invalid Stripe signature → 401

**Mark done:** [ ]

---

### Sprint 5.3 — Onboarding Flow

**State check:** Sprint 5.1 complete. Runs parallel with 5.2.

**Prompt:**
```
You are building Preview QA Agent. Multi-tenancy is complete.

Read: AGENTS.md, docs/REPOSITORY_STRUCTURE.md (reserved config files, previewqa/config.yaml example), docs/OPERATIONS_AND_SECURITY.md (preview environment prerequisites).

Your job is Sprint 5.3 — build the onboarding flow for new GitHub App installations.

## Trigger: GitHub App installation event

Add to apps/webhook-api: handle installation.created and installation_repositories.added events.
On new installation: enqueue an OnboardingMessage { type: 'installation.created', installationId, accountLogin, repositories[] }.

## Handle in apps/orchestrator:

### handleInstallationCreated(message)
1. Create installation record in DB (tier: free, monthly_run_count: 0)
2. For each repository: create repository record
3. For each repo: fetch list of open PRs (max 5) via github-adapter
4. For the most recent open PR: create and enqueue a RunCreatedMessage (mode: smoke) — this triggers the first automatic run
5. Post an onboarding comment to that PR using formatOnboardingComment()

## formatOnboardingComment() in packages/reporter:
This is the first message the developer sees. It must be helpful and not annoying.

Content:
👋 Preview QA Agent is now running on this repo.

**What just happened:** I ran a smoke check on your Vercel preview deployment.

**To unlock full test execution:** Add a QA block to your PR description. Copy this template:
[link to .github/PULL_REQUEST_TEMPLATE.md in the repo]

**Onboarding checklist:**
- [ ] PR template added to .github/PULL_REQUEST_TEMPLATE.md
- [ ] data-testid attributes added to key UI elements
- [ ] .previewqa/config.yaml created (optional but recommended)
- [ ] Sandbox test accounts configured

**Commands available:**
- /qa rerun — re-run QA on this PR
- /qa smoke — run smoke only
- /qa help — show all commands

<!-- previewqa-result -->

## Per-repo config (.previewqa/config.yaml) reader

In packages/config or packages/schemas:
- Add readRepoConfig(params: { installationId, owner, repo }): Promise<RepoConfig | null>
- Fetch .previewqa/config.yaml from the repo via github-adapter contents API
- Parse and validate against RepoConfigSchema
- Return null if file does not exist (use defaults)

In apps/orchestrator: call readRepoConfig at run start. Apply settings (default_mode, fork_policy, timeout, etc.).

Tests:
- Unit test: installation.created → installation record created, onboarding comment posted to latest open PR
- Unit test: .previewqa/config.yaml exists and valid → config applied to run
- Unit test: .previewqa/config.yaml missing → defaults used, no error
- Snapshot test: onboarding comment format

Definition of done: Install GitHub App on a test repo → onboarding comment appears on the most recent open PR → smoke run starts automatically.
```

**Exit check:**
- [ ] GitHub App install → onboarding comment on most recent open PR
- [ ] Smoke run triggered automatically on install
- [ ] `.previewqa/config.yaml` read and applied when present
- [ ] Config missing → defaults used, no error
- [ ] Snapshot test for onboarding comment passes

**Mark done:** [ ]

---

### Sprint 5.4 — Dashboard

**State check:** Sprints 5.1 and 5.2 complete.

**Prompt:**
```
You are building Preview QA Agent. Multi-tenancy and billing are complete.

Read: AGENTS.md, docs/REPOSITORY_STRUCTURE.md (apps/dashboard responsibilities).

Your job is Sprint 5.4 — build apps/dashboard.

This is an internal dashboard for installation owners to view their runs and manage config. Not public marketing pages.

## Stack:
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Auth: GitHub OAuth (use NextAuth.js with GitHub provider)
- Only the GitHub account that owns the installation can access their data

## Pages to build:

### / (redirect to /installations)

### /installations
List all installations for the logged-in GitHub user.
For each: installation name, tier, monthly_run_count / tier_limit, active repos count.
Actions: Manage (→ /installations/{id}), Upgrade plan (→ Stripe Checkout).

### /installations/{installationId}
Overview of one installation.
Sections:
- Usage: runs this month, repos used, current tier, upgrade/manage button (→ Stripe Portal)
- Repos: list of onboarded repos with last run status

### /installations/{installationId}/repos/{repoId}
Run history for one repo.
Table: PR number, head SHA (7 chars), mode, state, outcome, duration, timestamp.
Pagination: 20 per page.
Click row → /runs/{runId}

### /runs/{runId}
Run detail page.
Sections:
- Run metadata: installation, repo, PR, SHA, mode, state, duration
- Steps: table of all test_case records with step-level outcomes
- Artifacts: thumbnail grid of screenshots with lightbox. Trace download link.
- AI output: failure summary, risk classification, model trace metadata (latency, token counts)
- Timeline: state transitions with timestamps

## API routes (Next.js route handlers):
- GET /api/installations — list installations for authed user
- GET /api/installations/{id}/repos — list repos for installation
- GET /api/runs/{id} — get run detail
- GET /api/runs/{id}/artifacts — list artifact URLs

All API routes: verify session, verify installationId belongs to authed user.

Tests:
- Unit test: API route returns 401 when not authed
- Unit test: API route returns 403 when installationId does not belong to authed user
- Snapshot test: run detail page with a fixture run object

Definition of done: Log in with GitHub → see your installations → click into a repo → see run history → click a run → see step results and screenshot thumbnails.
```

**Exit check:**
- [ ] GitHub OAuth login works
- [ ] Installation list shows correct data from DB
- [ ] Run history loads with pagination
- [ ] Run detail shows screenshots (SAS URLs render as images)
- [ ] Unauthenticated request → 401
- [ ] Wrong installation → 403

**Mark done:** [ ]

---

### Sprint 5.5 — Security Review + Runbooks

**State check:** Sprints 5.1–5.4 complete. HUMAN sprint.

**Actions to take yourself:**

**Security review checklist:**
- [ ] `pnpm audit` — zero critical or high CVEs. Fix any found.
- [ ] Fork PR policy: manually attempt an authenticated run on a fork PR. Verify it is blocked.
- [ ] Secrets audit: search all logs, PR comments, and artifacts for any token-shaped strings. Must find none.
- [ ] GitHub App permission audit: review current permissions in GitHub App settings. Remove any beyond the minimum list.
- [ ] Dependency review: check for packages with known security issues (Snyk or npm audit).
- [ ] Key Vault access: verify no env file or code file contains the actual private key.

**Write remaining 5 runbooks** in `docs/runbooks/`:
- `bad-prompt-rollout.md` — how to roll back a planner/summarizer prompt change
- `false-failure-spike.md` — how to investigate a sudden rise in false failures
- `fork-policy-bypass-attempt.md` — how to respond to a suspected bypass
- `high-timeout-rate.md` — how to diagnose and fix widespread timeouts
- `noisy-repo.md` — how to throttle or pause a repo generating excessive runs

**Exit check:**
- [ ] `pnpm audit` — zero critical/high
- [ ] Fork PR authenticated run blocked (manual test)
- [ ] Zero token-shaped strings in any log or PR comment from test runs
- [ ] All 10 runbooks written (5 from Sprint 3.5 + 5 from this sprint)
- [ ] GitHub App permissions match the minimum list exactly

**Mark done:** [ ]

---

### Sprint 5.6 — Launch

**State check:** All Phase 5 sprints complete. M4 launch bar all green. HUMAN sprint.

**M4 launch bar — must all be true before proceeding:**
- [ ] ≥ 50 real PR runs completed successfully across all repos
- [ ] Preview resolution success rate > 95% (check App Insights)
- [ ] Platform-induced false failure rate < 5% (check App Insights)
- [ ] Fork PR policy enforced and independently tested (Sprint 5.5)
- [ ] All artifacts and logs reliably accessible for every run
- [ ] Multiple repos can onboard with predictable setup (Sprint 5.3)
- [ ] 10 runbooks written and reviewed
- [ ] Security review passed (Sprint 5.5)
- [ ] Billing tier enforcement working (Sprint 5.2)
- [ ] GitHub Marketplace listing live (Sprint 3.5)
- [ ] Pricing page live
- [ ] Dashboard live (Sprint 5.4)

**Launch actions:**
1. Enable paid tiers in Stripe (flip to live mode).
2. Deploy pricing page.
3. Send launch email to waitlist: "Preview QA Agent is live — start your free trial."
4. Social push: Twitter/X, LinkedIn, Indie Hackers, Vercel Discord.
5. Post "Show HN: I built a bot that browser-tests your Vercel previews on every PR."
6. Monitor: conversions, installs, run volume, error rate. Same-day response to all support.

**Exit check (M4 — Launch Candidate):**
- [ ] All launch bar items above checked
- [ ] First paying customer
- [ ] GitHub Marketplace shows install count incrementing
- [ ] Stripe dashboard shows live subscription

**Mark done:** [ ] ← **M4 — Launch closed**

---

## GTM Prompts (run any time from Phase 2 onward)

---

### GTM-1 — Landing Page + Waitlist

**Prompt:**
```
Build a minimal landing page for Preview QA Agent. No frameworks required — Next.js or plain HTML is fine.

The page must have:
1. Headline: "Your preview deployment, actually tested." (or the best of these alternatives: "Browser QA that lives inside your PR." / "Stop guessing if your preview works. Know.")
2. Subheadline: one sentence explaining what it does for GitHub + Vercel teams
3. A 3-step visual: (1) Open PR → (2) Bot tests preview → (3) Pass/fail in PR
4. Social proof placeholder: "Used by X teams" (fill in when real)
5. Email capture form (connect to Mailchimp or ConvertKit — just an email field and submit)
6. GitHub App install button (link to GitHub Marketplace)
7. Pricing section (copy from planning/05-PRICING-AND-MONETIZATION.md — the 5 tiers table)
8. Footer with: GitHub link, Twitter/X link, support email

Style: clean, developer-focused, dark mode preferred. No stock photos.
Deploy to Vercel.
```

---

### GTM-2 — Demo Video Script

**Prompt:**
```
Write a script for a 90-second demo video of Preview QA Agent. No voiceover needed — on-screen action only with brief text annotations.

Scene sequence:
1. (0:00-0:10) Developer opens a PR in GitHub. PR description has a QA block (show the YAML briefly).
2. (0:10-0:20) "Preview QA Agent" bot comment appears: "Running QA on your preview..."
3. (0:20-0:40) Time-lapse of the GitHub Check going from queued → in_progress → show a screenshot being captured.
4. (0:40-0:55) Bot posts result comment: "FAILED — The checkout button did not trigger the confirmation toast." Screenshot and trace link visible.
5. (0:55-1:10) Developer fixes the bug, pushes. Bot re-runs. New comment: "PASSED — All 4 cases passed."
6. (1:10-1:30) Show the GitHub Check as green. Reviewer approves the PR.

Annotations to add (white text, dark background):
- Scene 1: "Describe your QA in the PR — no test files needed"
- Scene 3: "Bot finds the Vercel preview and runs Playwright"
- Scene 4: "Evidence: screenshot + trace link posted directly to PR"
- Scene 5: "Fix pushed → automatic rerun"
- Scene 6: "Reviewer knows exactly what was tested"

Output: annotated script with timestamps, shot descriptions, and annotation text.
```

---

### GTM-3 — Product Hunt Copy

**Prompt:**
```
Write the Product Hunt listing for Preview QA Agent.

Product name: Preview QA Agent
Tagline (max 60 chars): Your Vercel preview, actually tested on every PR.

Description (300 words max):
- Open with the problem: developers merge PRs with broken UI because nobody tests the Vercel preview
- Explain the solution: a GitHub App that reads QA instructions from the PR, finds the preview, runs Playwright, posts results back — automatically
- Key differentiators vs. existing tools:
  - No test files to write or maintain
  - Instructions live in the PR description
  - Works on the ephemeral Vercel preview, not a fixed URL
  - AI summarizes failures in plain English
- Call to action: install free on GitHub Marketplace

First comment (founder comment, 150 words max):
- Brief founder story: what motivated building this
- How to get started in 5 minutes
- Invite feedback and questions

Gallery images (describe 3 screenshots to prepare):
1. A PR comment showing "FAILED" with step-level detail and a screenshot thumbnail
2. The PR description with the YAML QA block highlighted
3. The GitHub Check showing all steps passed with the previewqa check name

Output: full listing copy ready to paste into Product Hunt.
```

---

## Quick reference: what prompt to run next

Use this table to know exactly where you are and what to do next.

| If the last sprint you completed was... | Run next |
|---|---|
| Nothing — starting fresh | Sprint 0.1 (HUMAN), then Sprint 0.2 |
| Sprint 0.1 | Sprint 0.2 |
| Sprint 0.2 | Sprint 0.3 |
| Sprint 0.3 | Sprint 0.4 |
| Sprint 0.4 | Sprint 1.1 AND Sprint 1.2 (parallel) |
| Sprints 1.1 + 1.2 | Sprint 1.3 AND Sprint 1.4 (parallel) |
| Sprints 1.3 + 1.4 | Sprint 1.5 |
| Sprint 1.5 (M1 ✅) | Sprint 2.1 AND Sprint 2.2 (parallel) |
| Sprints 2.1 + 2.2 | Sprint 2.3 |
| Sprint 2.3 | Sprint 2.4 |
| Sprint 2.4 (M2 ✅) | Sprints 3.1 + 3.2 + 3.3 (all parallel) |
| Sprints 3.1 + 3.2 + 3.3 | Sprint 3.4 |
| Sprint 3.4 | Sprint 3.5 (HUMAN) |
| Sprint 3.5 (M3 ✅) | Sprints 4.1 + 4.2 + 4.3 + 4.4 (all parallel) |
| All Sprint 4.x | Sprints 5.1 + 5.2 + 5.3 (parallel) |
| Sprints 5.1 + 5.2 + 5.3 | Sprint 5.4 |
| Sprint 5.4 | Sprint 5.5 (HUMAN) |
| Sprint 5.5 | Sprint 5.6 (HUMAN — Launch) |

---

## Definition of done reminder (from AGENTS.md)

A sprint is not complete unless:
- Code is implemented
- Tests exist and pass
- Logs/metrics/traces added where relevant
- Docs updated if contract or workflow changed
- Failure modes handled
- Output is safe for untrusted inputs
- Exit check passes on a real environment (not just unit tests)
