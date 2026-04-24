# 90-Day Sprint Plan

> Week-by-week execution from day 1 to first revenue.
> Assumes 1–2 engineers, full-time.
> Dates anchored to start: **2026-04-28** (Week 1).

---

## Week 1 — Apr 28 – May 4 | Foundation: GitHub App + Azure

**Phase:** 0 — Foundation

| Day | Task |
|---|---|
| Mon | Register GitHub App on GitHub. Set permissions. Generate private key. Store in Azure Key Vault. |
| Mon | Create Azure subscription resources via Terraform: Resource Group, Key Vault, App Insights, PostgreSQL. |
| Tue | Scaffold monorepo: `pnpm init`, Turborepo config, TypeScript base config, ESLint + Prettier. |
| Tue | Create `packages/domain` — enums: run states, failure categories, modes, event types. |
| Wed | Terraform: Azure Service Bus namespace + queue. Azure Blob Storage account + containers. |
| Wed | Create `docker-compose.yml` for local dev: Postgres + Azurite (Service Bus emulator). |
| Thu | Create `.env.example` with all required env vars documented. |
| Thu | Bootstrap GitHub Actions CI: lint + type-check + test jobs. |
| Fri | Create `packages/schemas` — Zod schema for GitHub `pull_request.opened` webhook payload. |
| Fri | Verify: CI passes on empty scaffold. Terraform apply succeeds. Key Vault accessible. |

**Exit check:** Can receive and log a fake GitHub webhook event locally.

---

## Week 2 — May 5 – May 11 | Foundation: Webhook API + DB

**Phase:** 0 — Foundation

| Day | Task |
|---|---|
| Mon | Create `packages/db` — database schema migration setup (`node-pg-migrate`). |
| Mon | Write migrations for: `installation`, `repository`, `pull_request`, `run` tables. |
| Tue | Write migrations for: `plan`, `test_case`, `result`, `artifact`, `comment_record`, `model_trace`, `audit_event` tables. |
| Tue | Write typed repository functions for `run` CRUD operations. |
| Wed | Create `apps/webhook-api` — Azure Function project structure. |
| Wed | Implement webhook signature validation (HMAC-SHA256 using GitHub App secret). |
| Thu | Implement `pull_request.opened` handler: validate → normalize → enqueue to Service Bus → return 202. |
| Thu | Implement `pull_request.synchronize` and `.reopened` handlers. |
| Fri | Deploy `apps/webhook-api` to Azure Functions (dev environment). |
| Fri | Test: send fake GitHub PR event → event appears in Service Bus queue → run record created in DB. |

**Exit check (Phase 0 complete):** Fake PR event received, validated, stored as run record. Terraform dev environment fully provisioned.

---

## Week 3 — May 12 – May 18 | Alpha: GitHub Adapter + Vercel Adapter

**Phase:** 1 — Alpha

| Day | Task |
|---|---|
| Mon | Create `packages/github-adapter` — Octokit setup, installation token refresh logic. |
| Mon | Implement GitHub Check: create (with status `in_progress`) and update (conclusion `success`/`failure`). |
| Tue | Implement sticky PR comment upsert: post on first run, edit in place on subsequent runs. |
| Tue | Implement PR metadata fetch: head SHA, description, author login, fork detection. |
| Wed | Create `packages/vercel-adapter` — Vercel API client (deployment list for a repo + branch). |
| Wed | Implement preview URL resolution: query Vercel API for latest deployment matching head SHA. |
| Thu | Implement GitHub deployment status fallback: poll `GET /repos/{owner}/{repo}/deployments` events. |
| Thu | Implement `waiting_for_preview` logic: return signal if no preview found yet. |
| Fri | Write unit tests for github-adapter (mock Octokit) and vercel-adapter (mock Vercel API). |
| Fri | Test end-to-end: fake PR event → github-adapter creates Check → vercel-adapter resolves preview URL. |

---

## Week 4 — May 19 – May 25 | Alpha: Orchestrator + State Machine

**Phase:** 1 — Alpha

| Day | Task |
|---|---|
| Mon | Create `apps/orchestrator` — Azure Container App project structure. |
| Mon | Implement Service Bus consumer: dequeue message, route by event type. |
| Tue | Implement state machine: `queued → waiting_for_preview → planning → running → analyzing → reporting → completed`. |
| Tue | Implement superseded SHA detection: on new commit push, mark old run as `canceled`. |
| Wed | Implement preview polling loop: retry every 30 seconds, timeout after 15 minutes → `blocked_environment`. |
| Wed | Implement run coordination: call preview resolver → on success, advance to `planning` state. |
| Thu | Implement error handling: `failed` state transition on unrecoverable errors, retry policy for transient errors. |
| Thu | Wire orchestrator to github-adapter: update GitHub Check status on each state transition. |
| Fri | Deploy orchestrator to Azure Container Apps (dev environment). |
| Fri | Test: PR event → orchestrator processes → state transitions visible in DB → GitHub Check updated. |

---

## Week 5 — May 26 – Jun 1 | Alpha: Browser Runner + Playwright

**Phase:** 1 — Alpha

| Day | Task |
|---|---|
| Mon | Create `packages/runner-playwright` — Playwright setup, step executor interface. |
| Mon | Implement smoke step: `navigate` to URL, assert HTTP 200. |
| Tue | Implement smoke steps: `screenshot` capture, `assert_title`, `assert_visible`. |
| Tue | Implement artifact capture: screenshot to buffer, trace on failure start/stop. |
| Wed | Create `apps/browser-runner` — Docker image (Node 20 + Playwright Chromium, pinned version). |
| Wed | Implement runner entrypoint: accept run plan as JSON env var, execute steps, output structured result JSON. |
| Thu | Implement artifact upload to Azure Blob Storage: each screenshot + trace stored with signed URL returned. |
| Thu | Create Azure Container Apps Job definition (Terraform). |
| Fri | Build Docker image, push to Azure Container Registry. |
| Fri | Test: trigger job manually with a test URL → screenshots appear in Blob Storage → result JSON correct. |

---

## Week 6 — Jun 2 – Jun 8 | Alpha: Reporter + M1 Validation

**Phase:** 1 — Alpha

| Day | Task |
|---|---|
| Mon | Create `packages/reporter` — PR comment Markdown formatter. |
| Mon | Implement comment body: overall result badge, step table (pass/fail per step), artifact links, metadata footer. |
| Tue | Implement GitHub Check output body: summary + step breakdown. |
| Tue | Wire orchestrator → reporter: after runner completes, call reporter to update comment + check. |
| Wed | Integrate full pipeline: webhook → queue → orchestrator → runner → reporter. |
| Wed | Set up one internal repo as the first onboarded installation. |
| Thu | Open a real PR on the internal repo. Observe the full end-to-end flow. |
| Thu | Verify: screenshot in PR comment, GitHub Check shows pass/fail, DB state is correct. |
| Fri | **M1 retrospective:** Is preview resolution reliable? Are artifacts useful? |
| Fri | Document top 3 issues found. Fix critical ones before advancing. |

**Exit check (M1 — Internal Alpha):** End-to-end loop working on one internal repo. Screenshot and trace visible in PR. GitHub Check shows result. Superseded SHA cancels old run.

---

## Week 7 — Jun 9 – Jun 15 | Beta: Parser + YAML Validation

**Phase:** 2 — Beta

| Day | Task |
|---|---|
| Mon | Create `packages/parser` — marker extraction regex for `<!-- previewqa:start/end -->`. |
| Mon | Implement YAML parse from extracted block. |
| Tue | Implement Zod schema validation for PR instruction YAML (v1 spec). |
| Tue | Implement parse error reporting: format validation errors into clear PR comment guidance. |
| Wed | Add Zod schemas for all step types: `navigate`, `fill`, `click`, `assert_visible`, `assert_not_visible`, `assert_title`. |
| Wed | Write golden fixture tests: 10 valid YAML inputs, 10 invalid inputs with expected error messages. |
| Thu | Wire parser into orchestrator: after preview resolved, parse PR instructions before planning. |
| Thu | Handle `parse.not_found` → default to smoke mode. Handle `parse.error` → post error comment + run smoke. |
| Fri | Test: open PR with valid QA block → parser extracts and validates → run proceeds. Open PR with invalid block → error comment posted. |

---

## Week 8 — Jun 16 – Jun 22 | Beta: Planner + AI + Instruction Mode

**Phase:** 2 — Beta

| Day | Task |
|---|---|
| Mon | Create `packages/ai` — Azure OpenAI client. Model names from config only, never hardcoded. |
| Mon | Implement `plan_normalizer` prompt: convert YAML step to canonical Playwright step representation. |
| Tue | Create `packages/planner` — instruction-to-plan normalization. |
| Tue | Implement mode routing: `smoke` → default plan, `instruction` → explicit steps only, `hybrid` → both. |
| Wed | Implement `plan` + `test_case` DB record creation from normalized planner output. |
| Wed | Implement `failure_summarizer` prompt: given runner output, produce human-readable failure explanation. |
| Thu | Implement `risk_classifier` prompt: classify failure as `product_bug | test_bug | environment_issue | flaky | needs_clarification`. |
| Thu | Log all prompt metadata to `model_trace` table: input token count, output token count, model, latency. |
| Fri | Test: valid YAML instruction → planner → explicit test cases run by runner → result classified by AI. |
| Fri | Run golden fixture tests for all three modes. |

---

## Week 9 — Jun 23 – Jun 29 | Beta: Commands + Auth Profiles

**Phase:** 2 — Beta

| Day | Task |
|---|---|
| Mon | Add `issue_comment` webhook handler to `apps/webhook-api`. |
| Mon | Implement command parser: detect `/qa rerun`, `/qa smoke`, `/qa help` in comment body. |
| Tue | Implement `/qa rerun`: cancel current run for PR, create new run for head SHA. |
| Tue | Implement `/qa smoke`: create smoke-only run for head SHA, ignoring QA block. |
| Wed | Implement `/qa help`: post command reference comment to PR. |
| Wed | Implement commenter authorization check: only repo collaborators can trigger commands. |
| Thu | Implement login profile support: named profile in YAML → Key Vault secret reference. |
| Thu | Implement Playwright storage-state login: fetch credential from Key Vault, apply at runner startup. |
| Fri | Test: open PR → `/qa rerun` in comment → new run created. `/qa smoke` triggers smoke-only run. Login profile resolves credentials. |

---

## Week 10 — Jul 7 – Jul 13 | M2 Validation + Partner Outreach

**Phase:** 2 — Beta (wrap-up)

| Day | Task |
|---|---|
| Mon | Run M2 validation checklist: parse error reporting, hybrid mode, rerun commands, AI summaries, auth profiles. |
| Mon | Fix any M2 blockers found. |
| Tue | Survey 3–5 internal developers: "Are you using the QA block? Is the failure summary useful? 1–5 rating." |
| Tue | Gate B check: > 70% of PRs on internal repo have valid QA blocks? |
| Wed | Begin outreach to 10 Vercel-heavy startup eng leads (design partners). Personalized DMs. |
| Wed | Set up waitlist landing page (simple HTML + email capture — Notion, Carrd, or Framer). |
| Thu | **Product Hunt prep:** Record 60-second demo video of the full PR → bot → result flow. |
| Thu | Write Product Hunt listing copy (tagline, description, first comment). |
| Fri | **M2 retrospective:** What is working? What is not? Top 3 issues. |
| Fri | Publish ship-in-public Twitter/X thread: "Here's what we built in 10 weeks." |

**Exit check (M2 — Internal Beta):** Instruction mode, hybrid mode, rerun commands, AI summaries, auth profiles all working.

---

## Week 11 — Jul 14 – Jul 20 | Hardening: Security + Fork Policy

**Phase:** 3 — Hardening

| Day | Task |
|---|---|
| Mon | Implement fork PR detection in orchestrator: `pull_request.head.repo.fork === true`. |
| Mon | Implement fork policy enforcement: block authenticated runs, downgrade to smoke-only. |
| Tue | Log `audit_event` for every fork policy decision (fork detected, run downgraded, run blocked). |
| Tue | Write integration test: fork PR → authenticated run blocked → smoke-only proceeds → audit event logged. |
| Wed | Implement input sanitization: PR title, body, comment text treated as untrusted before passing to LLM. |
| Wed | Implement secret redaction in reporter: scan comment body for token-like strings before posting. |
| Thu | Implement per-step and per-run timeouts with graceful cancellation. |
| Thu | Implement retry policy: 3 attempts with exponential backoff for transient errors. |
| Fri | Implement failure classification in reporter: `flaky` shown distinctly from `product_bug`. |

---

## Week 12 — Jul 21 – Jul 27 | Hardening: Observability + Cost Controls

**Phase:** 3 — Hardening

| Day | Task |
|---|---|
| Mon | Create `packages/observability` — OpenTelemetry setup, Pino logger factory. |
| Mon | Add correlation ID propagation: every Service Bus message and job carries `runId`. |
| Tue | Wire OpenTelemetry spans across: webhook-api, orchestrator, browser-runner, reporter. |
| Tue | Configure App Insights: export OTEL spans, set up custom metrics (run duration, resolution latency). |
| Wed | Implement cost controls: concurrency cap per installation, video-on-failure-only, max cases per PR. |
| Wed | Configure Azure Blob lifecycle rules: screenshot 30d, trace 14d, video 14d, log 30d. |
| Thu | Set up 8 App Insights alert rules (see Phase 3 in development roadmap). |
| Thu | Build App Insights dashboard: operational view (active runs, queue depth, error rate). |
| Fri | Build App Insights dashboard: product health view (runs/day, false failure rate, mode breakdown). |
| Fri | Test all alert rules by simulating failure conditions in dev environment. |

---

## Week 13 — Jul 28 – Aug 3 | Hardening: Design Partners Onboarded

**Phase:** 3 — Hardening

| Day | Task |
|---|---|
| Mon | Onboard first external design partner repo (1 of 3). Walk them through PR template + first run. |
| Mon | Fix any onboarding friction issues found. |
| Tue | Onboard second design partner. |
| Wed | Write 5 operational runbooks: preview not found, runner crash, GitHub auth failure, Vercel token failure, queue stuck. |
| Thu | Onboard third design partner. |
| Thu | Monitor: false failure rate, preview resolution rate, run duration across all 3 external repos. |
| Fri | Weekly metrics review: operational SLOs vs. targets. Any below threshold → prioritize fix. |

---

## Week 14 — Aug 4 – Aug 10 | M3 Validation + Product Hunt Launch

**Phase:** 3 — Hardening (wrap-up)

| Day | Task |
|---|---|
| Mon | Run M3 validation checklist: fork policy, alerting, runbooks, false failure rate < 5%, 3+ external repos. |
| Mon | Gate C check: Is internal + external usage strong and stable? |
| Tue | **Product Hunt launch day.** Post at 12:01 AM PST. Share across all channels. |
| Tue | Respond to every Product Hunt comment within 4 hours. |
| Wed | Monitor: installs from Product Hunt. Engage with all new installs. |
| Thu | "Show HN: I built a bot that browser-tests your Vercel previews" — post to Hacker News. |
| Fri | **M3 retrospective.** Count: installs, active repos, false failure rate, design partner NPS. |
| Fri | List GitHub App on GitHub Marketplace (free tier). Write Marketplace listing copy. |

**Exit check (M3 — Private Beta):** 3+ external repos running, false failure rate < 5%, alerting live, Marketplace listing published.

---

## Week 15–18 — Aug 11 – Sep 7 | Phase 4: Repo-Aware Intelligence

**Phase:** 4 — Intelligence

| Week | Focus |
|---|---|
| Week 15 | Changed-file heuristics: parse PR diff, map changed files to affected routes/components |
| Week 16 | AI-assisted plan suggestions: given changed files + existing plan, suggest missing coverage as PR comment |
| Week 17 | `pgvector` retrieval: embed past run summaries, retrieve similar past runs for failure context |
| Week 18 | Prompt regression test suite: golden fixtures for planner and summarizer, run in CI |

---

## Week 19–20 — Sep 8 – Sep 21 | Phase 5: Multi-Tenancy + Billing

**Phase:** 5 — Launch readiness

| Week | Focus |
|---|---|
| Week 19 | Per-installation data isolation, concurrency rate limiting, quota enforcement in orchestrator |
| Week 20 | Stripe billing integration: subscription plans, metered overage billing, upgrade CTA in PR comment |

---

## Week 21–22 — Sep 22 – Oct 5 | Phase 5: Onboarding + Dashboard

**Phase:** 5 — Launch readiness

| Week | Focus |
|---|---|
| Week 21 | GitHub App install → onboarding flow → first run triggered, per-repo config wizard |
| Week 22 | `apps/dashboard` — run history, artifact browser, repo config, installation management |

---

## Week 23 — Oct 6 – Oct 12 | Security Review + Runbooks

**Phase:** 5 — Launch readiness

| Day | Task |
|---|---|
| Mon–Tue | Security review: secrets audit, fork policy test, dependency vulnerability scan, GitHub App permission audit |
| Wed–Thu | Write remaining 5 runbooks (total 10 required for M4) |
| Fri | Fix all security review findings. Deploy fixes to staging. |

---

## Week 24 — Oct 13 – Oct 19 | M4: Launch

**Phase:** 5 — Launch readiness

| Day | Task |
|---|---|
| Mon | Run M4 launch bar checklist: all items must be true before proceeding |
| Tue | Enable paid tiers in Stripe. Deploy pricing page. |
| Wed | **Launch email to waitlist.** Subject: "Preview QA Agent is live — start your free trial." |
| Thu | Social push: Twitter/X, LinkedIn, Indie Hackers, relevant Slack communities. |
| Fri | Monitor: conversions, installs, run volume, errors. Respond to all support emails same day. |

**Exit check (M4 — Launch Candidate):** Paid tiers live, first paying customers, ≥ 50 total internal PR runs logged, all launch bar items checked.

---

## Post-launch: Month 4–6 (Oct 20 – Dec 31)

| Activity | Target |
|---|---|
| Weekly: metrics review | MRR, installs, churn, false failure rate |
| Monthly: user interview | Talk to 3 active users + 1 churned user |
| Month 4: newsletter sponsorship | One sponsored post in Bytes.dev or TLDR Tech |
| Month 4: Vercel partnership outreach | Email Vercel ecosystem team about Marketplace listing |
| Month 5: Linear integration | Build and ship QA run → Linear issue link |
| Month 6: First Enterprise inquiry | Close first Enterprise deal if inbound |
| Month 6: revenue target | $10K MRR |

---

## Weekly operating rhythm

Every week, regardless of phase:

| Day | Routine |
|---|---|
| Monday | Review previous week metrics. Set 3 priorities for the week. |
| Wednesday | Ship at least one improvement to production. |
| Friday | Brief ship-in-public post (what shipped, what you learned). Update this sprint doc. |

**One rule:** Every week must ship something to production. No week-long planning without a deploy.
