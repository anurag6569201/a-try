# Execution Plan

> Organised by **sprints** (batches of related tasks), not calendar time.
> Each sprint is a prompt-session or agent-run unit — complete one sprint's exit check before starting the next.
> Order is strict. Sprints within the same phase can be parallelised across agents where noted.

---

## How to use this plan

- Each sprint is a self-contained unit of work for a coding agent or agent cluster.
- The **Exit check** is the acceptance test. Do not advance until it passes.
- Tasks marked `[PARALLEL]` can be delegated to separate agents simultaneously.
- Tasks marked `[HUMAN]` require a manual action (register, deploy, approve, send) that a coding agent cannot do.
- GTM sprints are independent of engineering sprints and can run in parallel with Phase 2 onward.

---

## Phase 0 — Foundation

### Sprint 0.1 — GitHub App + Azure Baseline `[HUMAN]`

Tasks:
- Register GitHub App on GitHub. Set minimum permissions: Pull requests rw, Issues w, Checks rw, Contents r, Metadata r, Commit statuses rw, Deployments r.
- Generate private key. Store in Azure Key Vault.
- Provision Azure resources via Terraform: Resource Group, Key Vault, App Insights, PostgreSQL, Service Bus, Blob Storage, Container Registry.
- Record all resource names and connection strings in `.env.example`.

Exit check: Azure resources exist, GitHub App is registered, private key is in Key Vault, `.env.example` is complete.

---

### Sprint 0.2 — Monorepo Scaffold `[PARALLEL with 0.1]`

Tasks:
- `pnpm init`, Turborepo config, TypeScript base `tsconfig.json`, ESLint + Prettier config.
- Create folder structure: `apps/webhook-api`, `apps/orchestrator`, `apps/browser-runner`, all `packages/` directories.
- Bootstrap GitHub Actions CI: lint + type-check + test jobs on push.
- `docker-compose.yml` for local dev: Postgres + Azurite (Service Bus + Blob emulator).

Exit check: `pnpm lint` and `pnpm typecheck` pass on empty scaffold. CI green.

---

### Sprint 0.3 — Domain Package + DB Schema

Tasks:
- `packages/domain`: enums for run states (`queued`, `waiting_for_preview`, `planning`, `running`, `analyzing`, `reporting`, `completed`, `failed`, `blocked_environment`, `needs_human`, `canceled`), failure categories, modes, event types.
- `packages/db`: migration tooling setup (`node-pg-migrate`). Write migrations for all 11 entities: `installation`, `repository`, `pull_request`, `run`, `plan`, `test_case`, `result`, `artifact`, `comment_record`, `model_trace`, `audit_event`.
- Typed repository functions for `run` CRUD.

Exit check: `pnpm db:migrate` runs without error. All tables exist in local Postgres. `run` CRUD functions pass unit tests.

---

### Sprint 0.4 — Zod Schemas

Tasks:
- `packages/schemas`: Zod schema for GitHub `pull_request.opened`, `.synchronize`, `.reopened` webhook payloads.
- Zod schema for Service Bus message envelopes.
- Zod schema for run creation and state transition events.

Exit check: All schemas parse valid fixture payloads. Invalid payloads produce typed errors.

**Phase 0 complete** when all four sprints are done.

---

## Phase 1 — Alpha: Core Loop

Goal: PR open → preview URL resolved → Playwright smoke → result in GitHub PR.

### Sprint 1.1 — Webhook API `[PARALLEL with 1.2]`

Tasks:
- `apps/webhook-api`: Azure Function project.
- Implement HMAC-SHA256 webhook signature validation.
- Handle `pull_request.opened`, `.synchronize`, `.reopened`: validate → normalize → enqueue to Service Bus → return 202.
- Handle GitHub deployment status events for preview detection.
- Deploy to Azure Functions (dev environment).

Exit check: Send fake `pull_request.opened` payload → event appears in Service Bus queue → run record created in DB → 202 returned within 500ms.

---

### Sprint 1.2 — GitHub Adapter + Vercel Adapter `[PARALLEL with 1.1]`

Tasks:
- `packages/github-adapter`: Octokit setup, installation token refresh. Implement GitHub Check create/update. Implement sticky PR comment upsert. Implement PR metadata fetch (head SHA, description, author, fork flag).
- `packages/vercel-adapter`: Vercel API client. Resolve preview URL for repo + branch + SHA. GitHub deployment status fallback. Return `waiting_for_preview` signal if not found yet.
- Unit tests for both packages (mocked external APIs).

Exit check: `github-adapter` creates a real GitHub Check on a test repo. `vercel-adapter` resolves a real preview URL given valid credentials.

---

### Sprint 1.3 — Orchestrator + State Machine

Tasks:
- `apps/orchestrator`: Azure Container App project, Service Bus consumer.
- State machine: all transitions from `queued` through `completed` / `failed`.
- Superseded SHA detection: new commit push → old run → `canceled`.
- Preview polling loop: retry every 30s, timeout after 15min → `blocked_environment`.
- Wire to `github-adapter`: update GitHub Check on each state transition.
- Deploy to Azure Container Apps (dev environment).

Exit check: PR event → orchestrator processes → state transitions in DB → GitHub Check updated in real GitHub UI.

---

### Sprint 1.4 — Playwright Runner + Artifact Upload `[PARALLEL with 1.3 after 1.2 is done]`

Tasks:
- `packages/runner-playwright`: step executor. Smoke steps: `navigate`, `assert_200`, `screenshot`, `assert_title`, `assert_visible`. Trace capture on failure.
- `apps/browser-runner`: Docker image (Node 20 + Playwright Chromium, pinned version). Entrypoint: accept plan as JSON, execute steps, return structured result JSON. Upload screenshots + traces to Azure Blob Storage.
- Azure Container Apps Job definition in Terraform.
- Build image, push to Azure Container Registry.

Exit check: Trigger job manually against a live URL → screenshots appear in Blob Storage → result JSON correct → signed artifact URLs accessible.

---

### Sprint 1.5 — Reporter + M1 Integration

Tasks:
- `packages/reporter`: format sticky PR comment (result badge, step table, artifact links, metadata footer). Format GitHub Check output body.
- Wire orchestrator → reporter: after runner completes, update comment + check.
- Full pipeline integration test: webhook → queue → orchestrator → runner → reporter.
- Onboard one internal repo as first installation.

Exit check **(M1)**: Open a real PR on the internal repo. Smoke run executes automatically. Screenshot visible in PR comment. GitHub Check shows pass or fail. Superseded SHA cancels old run without manual intervention.

---

## Phase 2 — Beta: Instruction-Driven

Goal: Structured YAML blocks in PR descriptions drive the test plan.

### Sprint 2.1 — Parser + YAML Validation `[PARALLEL with 2.2]`

Tasks:
- `packages/parser`: extract `<!-- previewqa:start/end -->` block from PR body. Parse YAML. Validate against versioned Zod schema.
- Parse error reporting: format validation errors → post clear guidance comment to PR.
- Zod schemas for all step types: `navigate`, `fill`, `click`, `assert_visible`, `assert_not_visible`, `assert_title`, `screenshot`.
- Golden fixture tests: 10 valid YAML inputs + 10 invalid inputs with expected error messages.
- Wire into orchestrator: parse PR instructions after preview resolved. `parse.not_found` → smoke. `parse.error` → error comment + smoke.

Exit check: Valid YAML block → parser returns typed plan. Invalid block → error comment posted to real PR. `parse.not_found` → smoke runs.

---

### Sprint 2.2 — AI Package `[PARALLEL with 2.1]`

Tasks:
- `packages/ai`: Azure OpenAI client (model deployment names from config, never hardcoded).
- Prompt `plan_normalizer`: YAML step → canonical Playwright step.
- Prompt `failure_summarizer`: runner output → human-readable failure explanation.
- Prompt `risk_classifier`: classify as `product_bug | test_bug | environment_issue | flaky | needs_clarification`.
- Log all prompt calls to `model_trace` table: input tokens, output tokens, model, latency.
- Golden fixture tests for each prompt.

Exit check: Each prompt returns correct output on 5 fixture inputs. `model_trace` rows written to DB. No model name hardcoded anywhere.

---

### Sprint 2.3 — Planner + Instruction Mode

Tasks:
- `packages/planner`: convert validated instructions → `plan` + `test_case` DB records.
- Mode routing: `smoke` → default plan, `instruction` → explicit steps, `hybrid` → explicit + smoke appended.
- AI-assisted step normalization via `packages/ai` for ambiguous selectors.

Exit check: Valid YAML instruction → planner → explicit test cases → runner executes them → AI classifies result. All three modes produce correct plans on fixture inputs.

---

### Sprint 2.4 — PR Commands + Auth Profiles

Tasks:
- `apps/webhook-api`: `issue_comment` event handler. Detect `/qa rerun`, `/qa smoke`, `/qa help`.
- `/qa rerun`: cancel current run, create new run for head SHA.
- `/qa smoke`: create smoke-only run ignoring QA block.
- `/qa help`: post command reference comment.
- Commenter authorization: only repo collaborators can trigger commands.
- Login profile support: named profile in YAML → Key Vault secret reference → Playwright `storageState` at runner startup.

Exit check **(M2)**: `/qa rerun` creates new run. `/qa smoke` ignores QA block. Login profile resolves to credential. AI failure summary appears in PR comment on failure. Hybrid mode runs explicit + smoke steps.

---

## Phase 3 — Hardening

Goal: Safe and stable for 3–5 external repos.

### Sprint 3.1 — Fork Policy + Input Security `[PARALLEL with 3.2]`

Tasks:
- Fork detection: `pull_request.head.repo.fork === true` → block authenticated runs, downgrade to smoke-only.
- `audit_event` logged for every fork policy decision.
- Input sanitization: PR title, body, comment text treated as untrusted before any LLM call.
- Secret redaction in reporter: scan comment body before posting.
- Integration test: fork PR → authenticated run blocked → smoke-only → audit event logged.

Exit check: Fork PR triggers smoke-only. `audit_event` row exists. Reporter comment contains no raw tokens or secrets.

---

### Sprint 3.2 — Retry, Timeouts, Failure Classification `[PARALLEL with 3.1]`

Tasks:
- Per-step timeout (configurable, default 30s). Per-run hard kill (default 10 min).
- Retry policy: 3 attempts, exponential backoff, transient error detection.
- Graceful cancellation: superseded or timed-out runs release resources and update GitHub Check.
- Failure classification surfaced distinctly in reporter: `flaky` vs. `product_bug` vs. `environment_issue`.

Exit check: Simulated timeout → run reaches `failed` state → GitHub Check updated → no orphaned runner jobs.

---

### Sprint 3.3 — Observability `[PARALLEL with 3.1 and 3.2]`

Tasks:
- `packages/observability`: OpenTelemetry setup, Pino logger factory.
- Correlation ID propagated through every Service Bus message and job: `runId`, `installationId`, `repoId`, `sha` on every log line.
- OTEL spans wired across: webhook-api, orchestrator, browser-runner, reporter.
- App Insights: export OTEL spans, custom metrics (run duration, resolution latency, false failure rate).
- Build two App Insights dashboards: operational (active runs, queue depth, error rate) + product health (runs/day, mode breakdown, false failure rate).
- 8 alert rules configured (signature failure spike, resolution failure spike, runner crash loop, artifact upload failure, Key Vault access failure, queue depth > 50, high timeout rate, unusual rerun volume).

Exit check: End-to-end run produces correlated OTEL trace visible in App Insights. All 8 alerts trigger correctly in dev environment when conditions are simulated.

---

### Sprint 3.4 — Cost Controls + Retention

Tasks:
- Per-installation concurrency cap (default 5, configurable).
- Rate limit on rerun commands: max 5 reruns per PR per hour.
- Video capture: failure or explicit debug mode only.
- Max test cases per PR (default 20, configurable).
- Azure Blob lifecycle rules: screenshots 30d, traces 14d, videos 14d, logs 30d.
- DB retention: run metadata 90d, audit events 90d+.

Exit check: Concurrency cap enforced under load test (6th run for same installation is queued, not started). Lifecycle rules verified in Azure portal.

---

### Sprint 3.5 — External Partner Onboarding + M3 `[HUMAN]`

Tasks:
- Onboard 3 external design partner repos. Walk each through PR template + first run.
- Write 5 operational runbooks: preview not found, runner crash, GitHub auth failure, Vercel token failure, queue stuck.
- Monitor false failure rate, preview resolution rate, run duration across 3 external repos.

Exit check **(M3)**: 3+ external repos active. False failure rate < 5%. Alerting live. 5 runbooks written. Marketplace listing published (free tier).

---

## Phase 4 — Repo-Aware Intelligence

All sprints in this phase can run in parallel with each other.

### Sprint 4.1 — Changed-File Heuristics

Tasks:
- Parse PR diff to extract changed file paths.
- Map file paths to affected Next.js routes (`pages/`, `app/`), components (`components/`), API endpoints (`api/`).
- Append heuristic-based additional smoke checks to the plan for changed routes.

Exit check: PR touching `app/dashboard/page.tsx` → plan includes a smoke check for `/dashboard`.

---

### Sprint 4.2 — AI Plan Suggestions

Tasks:
- Planner prompt: given changed files + existing YAML plan → suggest missing coverage.
- Post suggestions as informational PR comment (not blocking).
- Golden fixture: 5 PRs with diffs + plans → expected suggestions.

Exit check: Suggestions appear on real PR. False suggestion rate < 10% on golden fixtures.

---

### Sprint 4.3 — `pgvector` Retrieval

Tasks:
- Enable `pgvector` extension on existing PostgreSQL instance.
- Embed past run summaries using Azure OpenAI embeddings.
- On new run: retrieve 3 most similar past runs for failure summarizer context.
- Store embeddings in `model_trace` or a dedicated embeddings table.

Exit check: Failure summary for a known route references a similar past failure correctly. Retrieval latency < 2s.

---

### Sprint 4.4 — Prompt Regression Suite

Tasks:
- Golden fixture library: 20+ (input, expected output) pairs for planner, summarizer, classifier.
- Run fixtures in CI on every prompt or model config change.
- Fail CI if any fixture degrades.

Exit check: Fixture suite runs in CI. One intentionally broken prompt causes CI failure.

---

## Phase 5 — Launch Readiness

### Sprint 5.1 — Multi-Tenancy + Rate Limiting `[PARALLEL with 5.2]`

Tasks:
- Per-installation data isolation: all DB queries scoped by `installation_id`.
- Per-installation run concurrency cap, runs-per-hour cap.
- Noisy installation cannot exceed its quota or starve other tenants.
- Billing tier enforcement in run creation: check tier limits, block + post upgrade CTA if exceeded.

Exit check: Two installations running simultaneously are isolated. Quota-exceeded run triggers upgrade CTA comment in PR.

---

### Sprint 5.2 — Stripe Billing `[PARALLEL with 5.1]`

Tasks:
- Stripe Billing: subscription plans for Free, Starter, Growth, Team tiers.
- Metered billing for overage runs.
- Stripe webhook: update `installation.tier` on subscription events.
- Monthly run counter reset on billing cycle.
- Failed payment → 7-day grace → downgrade to Free.
- Self-serve cancellation in dashboard (downgrade at period end).

Exit check: Test Stripe webhook updates installation tier in DB. Overage triggers correct per-run charge. Cancellation downgrades at period end.

---

### Sprint 5.3 — Onboarding Flow `[PARALLEL with 5.1, 5.2]`

Tasks:
- GitHub App install → auto-trigger first run on most recent open PR.
- Onboarding checklist posted as PR comment: PR template detected? `data-testid` selectors found? Sandbox accounts configured?
- Per-repo config wizard: guide through `.previewqa/config.yaml` creation.

Exit check: Fresh install on a test repo → onboarding comment posted → first run triggered automatically.

---

### Sprint 5.4 — Dashboard `apps/dashboard`

Tasks:
- Installation management view.
- Per-repo run history list with status badges.
- Run detail: step outcomes, artifact browser, model trace metadata.
- Repo config editor.
- Usage stats: runs used vs. plan limit, active repos vs. limit.

Exit check: Dashboard loads for a real installation. Run history shows correct data. Artifact links open screenshots.

---

### Sprint 5.5 — Security Review + Runbooks `[HUMAN]`

Tasks:
- Secrets audit: no credentials in logs, artifacts, or PR comments.
- Fork policy independent test: attempt authenticated fork run and verify it is blocked.
- Dependency vulnerability scan (`pnpm audit`). Fix all critical/high CVEs.
- GitHub App permission audit: remove any permissions beyond minimum.
- Write remaining 5 runbooks (total 10): bad prompt rollout, false failure spike, fork policy bypass attempt, high timeout rate, noisy repo.

Exit check: All security findings resolved. 10 runbooks complete. `pnpm audit` shows zero critical/high vulnerabilities.

---

### Sprint 5.6 — Launch `[HUMAN]`

Tasks:
- Run M4 launch bar checklist: all items must be true.
- Enable paid tiers in Stripe. Deploy pricing page.
- Send launch email to waitlist.
- Social push: Twitter/X, LinkedIn, Indie Hackers, Vercel Discord, relevant Slack communities.
- Monitor: conversions, installs, run volume, errors. Respond to all support requests same day.

Exit check **(M4)**: Paid tiers live. First paying customer. ≥ 50 internal PR runs logged. All launch bar items checked.

---

## GTM Sprints (run in parallel with engineering Phase 2 onward)

These sprints have no code dependencies. They can be executed as separate agent tasks or manual actions independently of the engineering track.

### GTM Sprint G1 — Ship-in-Public Presence

Tasks:
- Write first Twitter/X ship-in-public thread: "What we're building and why."
- Set up waitlist landing page (Carrd, Framer, or Notion — email capture only).
- GitHub App listed on GitHub Marketplace (free tier, basic copy).

---

### GTM Sprint G2 — Design Partner Outreach

Tasks:
- Identify 20 Vercel-heavy startup eng leads (GitHub + Twitter search, personal network).
- Send 20 personalised outreach messages: free 60-day access in exchange for weekly 30-min feedback calls.
- Target: 5 confirmed design partners before M3.

---

### GTM Sprint G3 — Content Foundation

Tasks:
- Write and publish: "Why your Vercel preview deployment is a lie" (anchor SEO post).
- Write and publish: "How we added automated QA to every PR in one session."
- Record 60-second demo video: PR opens → bot runs → fails → developer fixes → bot reruns → passes.
- Cross-post all content to Dev.to and Hashnode.

---

### GTM Sprint G4 — Product Hunt Launch `[after M2]`

Tasks:
- Write Product Hunt listing: tagline, description, screenshots (3), first comment (founder story).
- Line up 10–20 supporters for launch day upvotes.
- Post at 12:01 AM PST on a Tuesday or Wednesday.
- Respond to every comment within 4 hours on launch day.
- Target: top 5 in Developer Tools, 200+ upvotes, 50+ installs on day 1.

---

### GTM Sprint G5 — Partnership Outreach `[after M3]`

Tasks:
- Email Vercel ecosystem team: pitch Vercel Marketplace listing + co-authored blog post.
- Reach out to Linear partnerships team: pitch native QA run → Linear issue integration.
- Identify 3 dev agencies for partner program conversation.

---

## Post-Launch Recurring Sprints

Run these on a repeating cadence after M4.

| Sprint | Cadence | Work |
|---|---|---|
| Metrics review | Weekly | MRR, installs, churn, false failure rate vs. targets |
| User interview | Monthly | 3 active users + 1 churned user — 30 min each |
| Newsletter sponsorship | Once (Month 4 post-launch) | Bytes.dev or TLDR Tech — measure installs per $spent |
| Vercel partnership follow-up | Monthly until closed | Move Vercel Marketplace listing forward |
| Linear integration | After $5K MRR | Build QA run → Linear issue link |
| First Enterprise deal | On first inbound inquiry | Close with MSA template |

---

## Operating principle for agent-driven execution

- One sprint = one agent session or cluster of parallel agent sessions.
- Always run the exit check before marking a sprint done.
- Sprints marked `[PARALLEL]` can be delegated to separate agents simultaneously.
- Sprints marked `[HUMAN]` require a real human action — no agent can substitute.
- When a sprint's exit check fails, the agent reruns that sprint, not the next one.
- No sprint is skipped. Phase gates are non-negotiable.
