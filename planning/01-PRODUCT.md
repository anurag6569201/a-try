# Product — Preview QA Agent

## Working name

**Preview QA Agent**

## One-line pitch

A GitHub-native QA agent that reads structured test instructions from a PR, waits for the Vercel preview deployment, runs browser validation against that preview, and posts an auditable pass/fail report with artifacts back to the PR.

---

## The problem

Frontend and full-stack teams merge PRs with broken user flows because:

- reviewers do not manually test preview URLs consistently
- QA instructions are buried in PR text, Slack, or tickets — not co-located with the code
- automated tests do not cover the changed path
- Vercel preview deployments exist but are underused
- browser agents become flaky when run with no structured intent
- developers need fast feedback inside the PR, not in a separate tool

**The gap:** Code review is strong. CI exists. Preview deployments exist. But actual preview verification is weak and inconsistent.

---

## Target users

### Primary ICP

| Dimension | Profile |
|---|---|
| Company size | 5–150 engineers |
| Stack | GitHub + Vercel (must-have for v1) |
| Team structure | No dedicated QA or < 1 QA per 10 devs |
| Shipping cadence | Multiple PRs/day |
| Pain | Preview URLs exist, nobody tests them reliably before merge |
| Budget owner | Eng lead or CTO at seed/Series A startup |

### Secondary users

- QA engineers who want repeatable preview verification without maintaining test suites
- Engineering managers who want visibility into pre-merge quality signals
- Platform teams building internal developer tooling
- Product teams shipping UI changes frequently

---

## Jobs to be done

| User | Job |
|---|---|
| Developer | When I open or update a PR, I want the preview URL automatically tested against the flows I described |
| Reviewer | Before approving, I want a trustworthy summary of what was tested, what failed, and links to evidence |
| Team | We want fewer UI regressions reaching main without forcing manual QA on every branch |

---

## Core value proposition

Five things combined that no existing tool does together:

1. **PR-native workflow** — works where developers already collaborate (GitHub)
2. **Preview deployment execution** — validates the actual deployed branch UI, not assumptions
3. **Structured intent** — developer declares what matters in the PR description (YAML block)
4. **Deterministic browser testing** — Playwright for reliable execution and artifacts
5. **AI-assisted reasoning** — plans tests, summarizes failures, explains risk clearly

---

## What this product is not

- Not a replacement for unit or integration tests
- Not a replacement for static analysis (CodeQL, Semgrep)
- Not a fully autonomous browser agent with no constraints
- Not a generic repo chatbot
- Not a full CI system
- Not a mobile native testing platform in v1
- Not a visual regression tool (that is deferred to a future phase)

---

## MVP scope

The MVP is complete when the system can:

1. Respond to PR open/update events from GitHub
2. Detect or wait for the Vercel preview URL for the PR commit
3. Parse a structured QA block from the PR description
4. Run deterministic Playwright checks against the preview
5. Post a pass/fail/blocked result back to the PR (sticky comment + GitHub Check)
6. Attach or link to test artifacts (screenshots, traces)
7. Support rerun from PR comments (`/qa rerun`, `/qa smoke`)
8. Safely handle failures, timeouts, and missing instructions

---

## Competitive landscape

| Competitor | What they do | Our differentiation |
|---|---|---|
| Chromatic / Percy | Visual pixel diff of UI components | We test behavioral flows, not visual snapshots |
| Meticulous | Auto-records and replays user sessions | We are intent-driven — developer declares test in PR |
| GitHub Actions + Playwright | Run Playwright in CI on a fixed URL | We target the ephemeral preview, zero config in customer repo, AI-planned |
| QA Wolf | Managed human + automation QA service | We are async, automated, low cost, inside the PR |
| Rainforest QA | No-code manual test automation | We are developer-native with no separate tool UI |

**Our wedge:** Zero test files to maintain. Instructions live in the PR. Works on the ephemeral Vercel preview automatically.

---

## Product principles

1. **Deterministic first** — AI for planning and explanation, not for replacing truth
2. **PR-native** — all important feedback appears inside GitHub
3. **Human-auditable** — every failure must include evidence and traceable reasoning
4. **Configuration over prompts** — stable behavior from contracts and config, not prompt magic
5. **Safe on untrusted code** — preview deployments are untrusted execution targets
6. **Useful before clever** — reliable smoke validation beats a flaky smart agent

---

## Success metrics at launch

| Metric | Target |
|---|---|
| p90 time from preview-ready to first QA result | < 10 minutes |
| Platform-induced false failure rate | < 5% |
| Preview resolution success rate | > 95% |
| PRs with parseable QA instructions (onboarded repos) | > 90% |
| Rerun success rate | > 95% |
| Internal usefulness score | > 4/5 |
| Pre-merge UI defects caught | Trending up month over month |

---

## Pricing summary

| Tier | Price | Key limits |
|---|---|---|
| Free | $0/mo | 1 repo, 50 runs/month, smoke only |
| Starter | $29/mo | 5 repos, 500 runs/month, instruction mode |
| Growth | $99/mo | 20 repos, 3,000 runs/month, auth profiles, AI summaries |
| Team | $299/mo | Unlimited repos, 10,000 runs/month, SSO, SLA |
| Enterprise | Custom | Self-hosted option, audit logs, dedicated support |

See [05-PRICING-AND-MONETIZATION.md](05-PRICING-AND-MONETIZATION.md) for full detail.

---

## Future capabilities (post-launch)

- Auto-suggest missing test cases based on diff
- Impacted route/component analysis using code graph
- Repo-aware test selection
- Visual regression layer
- Multi-tenant dashboard with historical analytics
- Knowledge graph over routes, components, tests, and PRs
- Mobile web testing
