# Phase 2 — Sprint Tickets

Quick reference for what to build, in order. Each ticket is self-contained.

---

## Sprint S-C: AI Code Review

### SC-1 · DB migration: review_record table
**Files**: `packages/db/migrations/004_review_record.sql`
```sql
CREATE TABLE review_record (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id     UUID NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  github_comment_id   BIGINT,
  github_review_id    BIGINT,
  body_hash           TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON review_record(pull_request_id);
```

---

### SC-2 · New package: packages/code-reviewer
**Create from scratch.**

`types.ts`:
```typescript
export type Severity = 'error' | 'warning' | 'info';
export interface Finding {
  severity: Severity;
  file: string;
  line?: number;
  title: string;
  body: string;
  suggestion?: string;
}
export interface ReviewOutput {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  findings: Finding[];
  securityFindings: Finding[];
  missingCoverage: string[];   // file paths with no test counterpart
}
```

`diff-chunker.ts`: split raw diff string into chunks ≤ 6000 tokens (rough: 4 chars/token → 24000 chars). Keep file headers with each chunk.

`prompts.ts`: three prompt templates — review, security, coverage.

`index.ts`: `reviewPR(diff, changedFiles, prTitle, prBody) → Promise<ReviewOutput>` — calls ai package in parallel for all three, merges results.

`formatter.ts`: `formatReviewComment(output: ReviewOutput) → string` — markdown table for findings, checkboxes for security.

---

### SC-3 · github-adapter: add review + diff methods
**File**: `packages/github-adapter/src/index.ts`

Add:
- `getDiff(owner, repo, pullNumber)` → raw diff string (Accept: application/vnd.github.v3.diff)
- `getChangedFiles(owner, repo, pullNumber)` → `{filename, status, additions, deletions}[]`
- `createOrUpdateReview(owner, repo, pullNumber, body, comments)` → github review with inline annotations
- `createOrUpdateStickyComment(owner, repo, pullNumber, marker, body)` → finds existing comment by marker string, patches it or creates new

---

### SC-4 · ai package: structured review output
**File**: `packages/ai/src/index.ts`

Add `reviewCode(systemPrompt, userPrompt) → Promise<ReviewOutput>` using OpenAI structured output (`response_format: { type: 'json_schema', ... }`). Define Zod schema, parse response.

---

### SC-5 · Orchestrator: pr.review worker
**File**: `apps/orchestrator/src/index.ts`

Add Service Bus subscription for `pr.review` topic. Handler `handlePrReview(prId)`:
1. Load PR from DB (get body, number, repo, installation)
2. Call `github-adapter.getDiff()` + `getChangedFiles()`
3. Call `code-reviewer.reviewPR()`
4. Upsert `review_record`
5. Call `github-adapter.createOrUpdateReview()` (inline annotations)
6. Call `github-adapter.createOrUpdateStickyComment()` (summary comment)

---

### SC-6 · Webhook: publish to pr.review topic
**File**: `apps/api/src/routes/webhooks.ts`

In `handlePullRequest()`, after creating the run row, also publish `{ prId }` to Service Bus topic `pr.review`.

---

## Sprint S-D: PreviewQA Execution

### SD-1 · vercel-adapter: real preview URL resolution
**File**: `packages/vercel-adapter/src/index.ts`

```typescript
export async function resolvePreviewUrl(
  repoFullName: string,
  sha: string,
  vercelToken: string,
  timeoutMs = 300_000,
): Promise<string | null>
```

Poll `GET https://api.vercel.com/v6/deployments` filtered by `gitSource.sha` and `target=preview`. Return `https://${deployment.url}` when `readyState === 'READY'`. Poll every 10s. Return null on timeout.

---

### SD-2 · browser-runner: Playwright executor
**Files**: `apps/browser-runner/src/`

`step-runner.ts`: maps YAML step types to Playwright calls. Handle errors per-step, capture screenshot on failure automatically.

`executor.ts`: `executeTestCase(page, steps[]) → StepResult[]`

`uploader.ts`: `uploadArtifact(runId, name, buffer, mimeType) → blobUrl` — Azure Blob Storage SDK.

`index.ts`: Service Bus consumer on `run.execute` topic. Runs executor, uploads artifacts, publishes `run.result` message back with `{ runId, stepResults, artifactUrls }`.

Use `mcr.microsoft.com/playwright:v1.44.0-jammy` as Docker base.

---

### SD-3 · Orchestrator: full run state machine
**File**: `apps/orchestrator/src/run-handler.ts` (new file, imported by index.ts)

Implement `handleRun(runId)` with the full state machine:
```
queued → waiting_for_preview → planning → running → analyzing → reporting → completed/failed
```

Each state transition updates `run.state` in DB immediately so the frontend SSE stream shows live progress.

---

### SD-4 · ai package: failure classification
**File**: `packages/ai/src/index.ts`

Add `classifyFailure(action, selector, error, screenshotB64?) → Promise<FailureClassification>`:
```typescript
export interface FailureClassification {
  category: 'product_bug' | 'test_bug' | 'environment' | 'flaky';
  reason: string;
  suggested_fix: string;
}
```
Uses structured output. Called once per failed step.

---

### SD-5 · github-adapter: Check Run wiring
**File**: `packages/github-adapter/src/index.ts`

Add:
- `createCheckRun(owner, repo, sha, name) → checkRunId`
- `updateCheckRun(checkRunId, status, conclusion, summary) → void`

Called from orchestrator at state transitions: queued→queued, running→in_progress, completed→success, failed→failure.

---

### SD-6 · reporter: results comment formatter
**File**: `packages/reporter/src/index.ts`

`formatRunComment(run, stepResults, artifacts) → string`:
- Header: pass/fail badge, run duration
- Steps table: ✓/✗ per step, duration, failure category
- Screenshots: inline `![screenshot](blobUrl)` for key screenshots
- AI summary: failure reason + suggested fix for each failed step
- Footer: link to dashboard run detail page

---

### SD-7 · DB migration: add check_run_id to run table
**File**: `packages/db/migrations/005_check_run_id.sql`
```sql
ALTER TABLE run ADD COLUMN github_check_run_id BIGINT;
```

---

## Sprint S-E: Dashboard Polish

### SE-1 · API: PR list + review endpoints
**File**: `apps/api/src/routes/prs.ts` (new)

- `GET /api/installations/:id/repos/:repoId/prs` — paginated PR list with latest run state + review exists flag
- `GET /api/installations/:id/repos/:repoId/prs/:prId/review` — latest review_record with findings JSON

Wire into `apps/api/src/index.ts`.

---

### SE-2 · Frontend: PR list page
**File**: `apps/web/src/pages/PrList.tsx` (new)

Table: PR title, author, branch, run state badge, review badge (✓ reviewed / pending), opened date. Links to PR detail.

---

### SE-3 · Frontend: PR detail page
**File**: `apps/web/src/pages/PrDetail.tsx` (new)

Left panel: AI review findings (grouped by severity, with file+line, inline diff view).  
Right panel: Latest run — step timeline, screenshots, AI failure summaries.

---

### SE-4 · Frontend: artifact gallery in run detail
**File**: `apps/web/src/pages/RunDetail.tsx` (update existing)

Add screenshot gallery below step list. Each screenshot opens full-size in a lightbox. Trace download button.

---

## Key decisions / constraints

- **No new infra** beyond adding Service Bus topics (topics are free to add in existing namespace)
- **GitHub App auth for API calls**: use Installation Access Token (short-lived) from App private key — not a PAT. `github-adapter` must implement `getInstallationToken(installationId)` using `@octokit/auth-app`.
- **Diff size limit**: skip inline annotations if diff > 400 files (too large for one review). Post summary comment only.
- **Flaky retry**: if failure category = `flaky`, auto-retry the step once. If still fails, mark as `flaky` in results.
- **Fork PRs**: already downgraded to smoke-only in webhook handler. Smoke test = navigate `/`, assert `<body>` visible, screenshot.
- **Cost guard**: max 3 LLM calls per review (review + security + coverage). Cache by `body_hash` — skip re-review if PR body + diff SHA unchanged.
