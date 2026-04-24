# Metrics and Analytics

## Overview

Three categories of metrics to track:
1. **Product metrics** — is the product working and useful?
2. **Business metrics** — is the business healthy and growing?
3. **Operational SLOs** — is the system reliable enough to trust?

Review cadence: weekly for operational SLOs, weekly for business metrics, monthly for product health deep-dives.

---

## Product metrics

### Core health metrics (check weekly)

| Metric | Target | Why it matters |
|---|---|---|
| p90 time from preview-ready to first QA result | < 10 minutes | Core product promise — if this is slow, the product is not useful |
| Preview resolution success rate | > 95% | If we can't find the preview, the product does nothing |
| Platform-induced false failure rate | < 5% | False failures destroy trust faster than any other issue |
| Smoke run success rate | > 90% | Baseline reliability of the core loop |
| Rerun success rate | > 95% | `/qa rerun` must work reliably or developers lose trust |

### Adoption metrics (check weekly)

| Metric | Target | Why it matters |
|---|---|---|
| PRs with valid QA block on onboarded repos | > 90% | Measures PR template + developer habit adoption |
| Active repos (≥ 1 run/week) | Growing | Lagging indicator of real usage |
| Runs per active repo per week | Trending up | Measures depth of usage, not just installs |
| QA block parse error rate | < 10% | If too many blocks are invalid, template UX needs work |

### Quality metrics (check monthly)

| Metric | Target | Why it matters |
|---|---|---|
| Pre-merge UI defects caught (reported by developers) | Trending up | Ultimate product value signal |
| False negative rate (bug reached main despite QA pass) | Trending down | Measures test coverage quality |
| Developer usefulness rating (NPS survey) | > 4/5 | Subjective quality signal — run quarterly |
| Failure classification accuracy | > 85% correct | AI classification quality |

### AI quality metrics (check on every prompt change)

| Metric | Target |
|---|---|
| Planner golden fixture pass rate | 100% (regression gate) |
| Failure summarizer usefulness rating (sampled) | > 4/5 |
| False positive AI suggestions (irrelevant test suggestions) | < 10% |
| Model trace latency p95 | < 8 seconds |

---

## Business metrics

### Revenue (check weekly)

| Metric | Target at 6 months | Target at 12 months |
|---|---|---|
| MRR | $5,000 | $30,000 |
| ARR | $60,000 | $360,000 |
| New MRR per month | $1,000+ | $5,000+ |
| Churned MRR per month | < 5% of total MRR | < 5% of total MRR |
| Net Revenue Retention (NRR) | > 100% | > 110% |
| Average Revenue Per Account (ARPA) | $60+ | $100+ |

### Growth (check weekly)

| Metric | Target at launch | Target at 6 months |
|---|---|---|
| GitHub App installs (total) | 100 | 500 |
| Active installations (ran ≥ 1 run/week) | 30 | 150 |
| Free → paid conversion rate | > 8% | > 10% |
| Waitlist signups (pre-launch) | 200 | — |
| Product Hunt upvotes | 200+ | — |

### Retention (check monthly)

| Metric | Target |
|---|---|
| Monthly logo churn | < 5% |
| Monthly MRR churn | < 5% |
| 30-day retention (active runs) | > 70% |
| 90-day retention | > 50% |
| Expansion revenue (upgrades) | > 15% of MRR monthly |

### Customer acquisition (check monthly)

| Metric | Target |
|---|---|
| CAC (blended) | < $200 (founder-led, no paid ads) |
| LTV (Starter tier, 12-month retention) | ~$350 |
| LTV (Growth tier, 12-month retention) | ~$1,200 |
| LTV / CAC ratio | > 3x |
| Time to first paid run | < 10 minutes from install |

---

## Operational SLOs

These are contractual targets that determine service reliability. Review in App Insights dashboards daily.

| SLI | Target SLO | Alert threshold |
|---|---|---|
| Webhook acknowledge latency p95 | < 2 seconds | > 5 seconds |
| Queue-to-orchestrator start latency p95 | < 60 seconds | > 3 minutes |
| Preview-ready to first result p90 | < 10 minutes | > 15 minutes |
| Artifact upload success rate | > 99% | < 95% |
| Preview resolution success rate | > 95% | < 85% |
| Platform-induced false failure rate | < 5% | > 10% |
| Runner crash rate (container exits before completion) | < 2% | > 5% |
| GitHub Check update success rate | > 99.5% | < 98% |
| PR comment upsert success rate | > 99.5% | < 98% |
| DB query error rate | < 0.1% | > 1% |

---

## Analytics instrumentation plan

### What to track in the product (events)

Every event should include: `installationId`, `repoId`, `pullRequestId`, `runId`, `sha`, `timestamp`, `mode`

| Event | When to fire |
|---|---|
| `run.created` | Run record inserted |
| `run.preview_resolved` | Preview URL successfully found |
| `run.preview_wait_timeout` | Preview not found within timeout |
| `run.planning_started` | Orchestrator starts planner |
| `run.runner_started` | Browser runner job launched |
| `run.runner_completed` | Runner job exits (success or failure) |
| `run.artifact_uploaded` | Each artifact stored |
| `run.reported` | GitHub Check + PR comment updated |
| `run.completed` | Run reaches terminal state (completed/failed/blocked/canceled) |
| `run.superseded` | Old run canceled because new commit pushed |
| `parse.success` | QA block parsed successfully |
| `parse.error` | QA block failed validation |
| `parse.not_found` | No QA block in PR description |
| `command.received` | `/qa rerun` or `/qa smoke` received |
| `command.executed` | Command successfully processed |
| `fork_pr.blocked` | Authenticated run blocked for fork PR |
| `install.created` | New GitHub App installation |
| `install.deleted` | GitHub App uninstalled |
| `quota.hit` | Run blocked due to plan limit |
| `upgrade.triggered` | Upgrade CTA clicked from PR comment |

### Dashboards to build (App Insights)

#### Operational dashboard (real-time, on-call)
- Active runs by state (live count)
- Queue depth (Service Bus message count)
- Run completion rate over last 1 hour
- Preview resolution failure rate over last 1 hour
- Error rate by component (webhook, orchestrator, runner, reporter)
- Runner crash count

#### Product health dashboard (daily review)
- Runs per day (7-day trend)
- Mode breakdown: smoke vs. instruction vs. hybrid
- Pass / fail / blocked / error breakdown
- p50/p90/p99 run duration
- False failure rate (7-day rolling)
- Parse success vs. error rate

#### Business dashboard (weekly review)
- New installs per day (7-day trend)
- Active repos per week
- Runs per active repo
- Free vs. paid run volume
- Quota hits per day (signals upgrade intent)
- Churn events (uninstalls)

---

## Reporting cadence

| Audience | Frequency | Format |
|---|---|---|
| Founder (self) | Daily | App Insights operational dashboard glance |
| Founder (self) | Weekly | Business metrics spreadsheet update |
| Design partners | Monthly | "Here's what we shipped + your usage stats" email |
| Investors (if applicable) | Monthly | MRR, installs, retention, key product wins |
| All users | Quarterly | Product changelog + roadmap preview |
