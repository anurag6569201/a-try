# Risk Register

Risk ratings: **Probability** (Low / Medium / High) × **Impact** (Low / Medium / High / Critical)

Review this register monthly. Update mitigations as risks materialize or resolve.

---

## Technical risks

### T1 — Preview URL not reliably detected

| | |
|---|---|
| Probability | Medium |
| Impact | High |
| Description | Vercel changes the preview URL format, deployment event timing, or API response shape. Preview not found for legitimate PRs. |
| Mitigation | Vercel adapter is isolated behind an interface — changes are contained. Monitor Vercel changelog. Implement GitHub deployment status as a secondary fallback. Classify unresolved previews as `blocked_environment`, not `failed`. |
| Owner action | If resolution rate drops below 90%, pause new feature work and fix the adapter |

---

### T2 — Playwright runner flakiness erodes developer trust

| | |
|---|---|
| Probability | High |
| Impact | High |
| Description | Playwright tests fail intermittently due to timing, selector instability, or preview environment variability. Developers stop trusting the QA result. |
| Mitigation | Require `data-testid` selectors in onboarding. Bounded retry per step (max 2 retries). Classify flaky failures as `flaky`, not `product_bug`. Surface flaky classification clearly in PR comment. |
| Owner action | If false failure rate exceeds 10%, pause new feature work. Run root cause analysis on all flaky runs. |

---

### T3 — Azure cost per run exceeds COGS target

| | |
|---|---|
| Probability | Medium |
| Impact | High |
| Description | Container Apps Jobs billing grows faster than expected. AI token costs are higher than estimated. Revenue does not cover infrastructure costs. |
| Mitigation | Hard runner timeout (10 min). Capture video only on failure. Cap AI tokens per call. Use smaller model for classification. Monitor cost-per-run weekly in Azure Cost Management. Reserve capacity when volume grows. |
| Owner action | If COGS > $0.05/run, implement cost optimizations before adding new runs or customers |

---

### T4 — Database schema requires breaking migration on live system

| | |
|---|---|
| Probability | Medium |
| Impact | Medium |
| Description | As the product evolves, DB schema changes require downtime or complex migration steps. |
| Mitigation | Use a migration tool (e.g., `node-pg-migrate`). Never alter column types in place — add new column, backfill, drop old. Staging environment tests migrations before prod. |
| Owner action | All schema changes reviewed before applying to prod |

---

### T5 — GitHub API rate limits hit under load

| | |
|---|---|
| Probability | Low |
| Impact | Medium |
| Description | High run volume triggers GitHub API rate limiting on Check updates or PR comment upserts. |
| Mitigation | Use GitHub App installation tokens (higher rate limits than OAuth). Queue reporter calls. Retry on 429 with backoff. Monitor GitHub API error rate in App Insights. |

---

### T6 — Azure OpenAI model deprecation or behavior change

| | |
|---|---|
| Probability | Medium |
| Impact | Medium |
| Description | Azure OpenAI deprecates a model deployment. Prompt behavior changes with a new model version. |
| Mitigation | Model deployment names are config, not hardcoded. Golden fixture tests catch prompt regressions. Maintain a staging model deployment for testing before production rollout. |

---

## Security risks

### S1 — Fork PR credential exfiltration (Critical)

| | |
|---|---|
| Probability | Low |
| Impact | Critical |
| Description | A malicious fork PR deploys code that exfiltrates test credentials injected into the preview runner. |
| Mitigation | Fork PRs are detected via `pull_request.head.repo.fork === true`. Authenticated runs are blocked by default for fork PRs. Only unauthenticated smoke allowed. Audit event logged for every fork policy decision. This is non-negotiable and must be implemented in Phase 1. |
| Owner action | Any bypass of fork policy is a Sev 1 incident. Incident response immediately. |

---

### S2 — Secret leakage via PR comment or artifact

| | |
|---|---|
| Probability | Low |
| Impact | Critical |
| Description | A credential or token appears in a GitHub PR comment, screenshot, or trace due to a logging or reporting bug. |
| Mitigation | Never log raw credentials. Redact secrets before passing to reporter. Use references (Key Vault secret names), not values, in metadata. PR comment content reviewed in golden test fixtures. |
| Owner action | Sev 1 incident. Rotate all exposed secrets immediately. Investigate and fix root cause before next deploy. |

---

### S3 — Prompt injection via PR body or page DOM

| | |
|---|---|
| Probability | Medium |
| Impact | Medium |
| Description | An attacker crafts PR description content or page DOM text to manipulate the AI planner or summarizer into producing harmful output or leaking system prompts. |
| Mitigation | System prompts are static and code-owned. User content is parsed structurally (Zod) before passing to LLM. LLM output is used only for plan generation and human-readable summaries — never for executing arbitrary code or tool calls. |

---

### S4 — GitHub App private key compromise

| | |
|---|---|
| Probability | Low |
| Impact | Critical |
| Description | The GitHub App private key is exposed, allowing an attacker to impersonate the app and post comments or update checks on any installed repo. |
| Mitigation | Private key stored only in Azure Key Vault. Never in environment variables, code, or logs. Access via managed identity only. Key rotation procedure documented in runbook. |

---

## Business risks

### B1 — Developers do not fill the QA block in PR descriptions

| | |
|---|---|
| Probability | High |
| Impact | Medium |
| Description | Developers skip the structured YAML block. The product runs smoke-only on every PR, reducing perceived value. |
| Mitigation | Strong PR template enforces the habit. Smoke fallback always runs (some value regardless). Parse error gives helpful guidance. Design partner onboarding includes a 30-min "first QA block" session. |
| Owner action | Gate B: If < 40% of PRs have valid blocks after 4 weeks, improve template and onboarding before building deeper intelligence. |

---

### B2 — Vercel changes integrations or pricing, breaking our dependency

| | |
|---|---|
| Probability | Low |
| Impact | High |
| Description | Vercel deprecates their deployment status API, removes the preview URL pattern, or restricts access to deployment data. |
| Mitigation | Vercel adapter is isolated and swappable. GitHub deployment status events are a secondary source. Long-term: support other preview providers (Netlify, Railway, Render) to reduce Vercel dependency. |

---

### B3 — Slow customer acquisition — installs but no conversions

| | |
|---|---|
| Probability | Medium |
| Impact | High |
| Description | GitHub App gets installs from Marketplace but free users don't convert to paid. |
| Mitigation | Upgrade CTA in PR comment when quota is hit (lowest-friction conversion point). Free tier limit (50 runs) is low enough to force a decision quickly for active teams. Run cohort analysis: which repos are most active, which convert. |
| Owner action | If < 5% conversion rate at Month 3, run user interviews. Adjust pricing or free limits. |

---

### B4 — Churn due to false failures

| | |
|---|---|
| Probability | Medium |
| Impact | High |
| Description | Customers cancel because the bot posts false failures too often. Developers distrust it and uninstall. |
| Mitigation | False failure rate < 5% is a non-negotiable product target. Failure classification is shown in every report. Flaky classification is shown distinctly. NPS survey runs quarterly. |
| Owner action | If monthly churn > 5%, root cause with churned customers. False failures are the most common churn trigger — investigate immediately. |

---

### B5 — Founder bandwidth (1–2 engineers)

| | |
|---|---|
| Probability | High |
| Impact | High |
| Description | The spec covers a large surface area. Attempting too much too fast leads to nothing working well. |
| Mitigation | Phase gates are strict — do not start Phase N+1 until Phase N exit criteria are met. P3 features are explicitly off-limits until traction is proven. Weekly scope review: is the current sprint focused on P0 items only? |
| Owner action | If Phase 1 takes more than 8 weeks, cut scope rather than delaying M1. |

---

### B6 — A large company (GitHub, Vercel, Linear) ships a native version

| | |
|---|---|
| Probability | Low | 
| Impact | High |
| Description | GitHub ships native PR browser testing. Vercel ships a QA product. Renders this product obsolete. |
| Mitigation | Move faster than large companies can (they take 12–18 months to ship). Build deep GitHub + Vercel integration that feels native. Build customer relationships that create switching cost. Differentiate on AI-planned instructions — harder to replicate than a button. |

---

## Operational risks

### O1 — Queue stuck — Service Bus messages not consumed

| | |
|---|---|
| Probability | Low |
| Impact | High |
| Description | Orchestrator crashes or is misconfigured. Messages pile up in Service Bus. PRs get no QA result. |
| Mitigation | Alert on queue depth > 50 messages. Dead letter queue captures failed messages for inspection. Runbook: queue stuck recovery procedure. |

---

### O2 — Runner container image bloat increases startup latency

| | |
|---|---|
| Probability | Medium |
| Impact | Medium |
| Description | Playwright base image grows over time. Container Apps Job startup time exceeds SLO. |
| Mitigation | Pin Playwright version. Use multi-stage Docker build. Image size limit enforced in CI. Measure job startup time in App Insights. |

---

### O3 — Noisy repo floods the queue and starves other customers

| | |
|---|---|
| Probability | Medium |
| Impact | Medium |
| Description | One high-volume repo or abusive rerun behavior (e.g., scripted `/qa rerun` spam) consumes all concurrency. |
| Mitigation | Per-installation concurrency cap (configurable). Rate limit on rerun commands (max 5 reruns per PR per hour). Noisy installation alert. Ability to pause an installation if abuse is detected. |

---

## Risk summary table

| Risk | Probability | Impact | Status |
|---|---|---|---|
| T1 — Preview URL not detected | Medium | High | Mitigated (adapter pattern + fallback) |
| T2 — Playwright flakiness | High | High | Mitigated (flaky classification + retry) |
| T3 — Azure cost too high | Medium | High | Mitigated (cost controls) |
| T4 — DB breaking migration | Medium | Medium | Mitigated (migration tooling) |
| T5 — GitHub rate limits | Low | Medium | Mitigated (App tokens + retry) |
| T6 — AI model deprecation | Medium | Medium | Mitigated (config-driven models) |
| S1 — Fork PR exfiltration | Low | Critical | **Non-negotiable — implement in Phase 1** |
| S2 — Secret leakage | Low | Critical | Mitigated (Key Vault + redaction) |
| S3 — Prompt injection | Medium | Medium | Mitigated (structural parsing first) |
| S4 — Private key compromise | Low | Critical | Mitigated (Key Vault + managed identity) |
| B1 — No QA block adoption | High | Medium | Mitigated (smoke fallback + template) |
| B2 — Vercel API dependency | Low | High | Partially mitigated (adapter pattern) |
| B3 — Low conversion | Medium | High | Mitigated (in-PR upgrade CTA) |
| B4 — Churn from false failures | Medium | High | Mitigated (< 5% false failure target) |
| B5 — Founder bandwidth | High | High | **Requires discipline — phase gates** |
| B6 — Competitor ships native | Low | High | Mitigated (speed + differentiation) |
| O1 — Queue stuck | Low | High | Mitigated (alert + runbook) |
| O2 — Runner startup latency | Medium | Medium | Mitigated (image size + monitoring) |
| O3 — Noisy repo | Medium | Medium | Mitigated (concurrency cap + rate limit) |
