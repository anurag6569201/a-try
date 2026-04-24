# Pricing and Monetization

## Pricing philosophy

- Price on value delivered (pre-merge defects caught, developer time saved), not raw compute
- Free tier exists to drive GitHub Marketplace installs and reduce friction to try
- Upgrade is triggered naturally: hit the run limit → see prompt in PR comment → one-click Stripe
- No sales call required up to Team tier
- Enterprise is the only tier that needs human contact

---

## Pricing tiers

### Free — $0/month

**For:** Individual developers, solo projects, evaluation

| Limit | Value |
|---|---|
| Repos | 1 |
| Runs per month | 50 |
| Mode | Smoke only |
| Auth profiles | None |
| Artifact retention | 7 days |
| Support | Community (GitHub Discussions) |

**Conversion hook:** Run limit reached → PR comment: "You've used 50/50 runs this month. Upgrade to Starter to continue."

---

### Starter — $29/month

**For:** Small teams (2–5 devs), single product

| Limit | Value |
|---|---|
| Repos | 5 |
| Runs per month | 500 |
| Mode | Smoke + instruction + hybrid |
| Auth profiles | 2 named profiles |
| AI summaries | Yes |
| Artifact retention | 14 days |
| Support | Email (48h SLA) |

**Annual discount:** $24/month (billed $288/year — save 17%)

---

### Growth — $99/month

**For:** Growing teams (5–20 devs), multiple products or microservices

| Limit | Value |
|---|---|
| Repos | 20 |
| Runs per month | 3,000 |
| Mode | All modes |
| Auth profiles | 10 named profiles |
| AI summaries | Yes |
| Repo-aware suggestions | Yes (Phase 4) |
| Concurrency | 5 parallel runs |
| Artifact retention | 30 days |
| Support | Email (24h SLA) |

**Annual discount:** $83/month (billed $996/year — save 16%)

---

### Team — $299/month

**For:** Larger engineering teams (20–100 devs), high-volume PRs

| Limit | Value |
|---|---|
| Repos | Unlimited |
| Runs per month | 10,000 |
| Mode | All modes |
| Auth profiles | Unlimited |
| AI summaries | Yes |
| Repo-aware suggestions | Yes |
| Concurrency | 15 parallel runs |
| SSO (SAML) | Yes |
| SLA | 99.5% uptime |
| Artifact retention | 90 days |
| Support | Priority email + Slack (4h SLA) |

**Annual discount:** $249/month (billed $2,988/year — save 17%)

---

### Enterprise — Custom pricing

**For:** Large organizations (100+ devs), compliance requirements, self-hosted needs

| Feature | Value |
|---|---|
| Repos | Unlimited |
| Runs per month | Custom |
| Concurrency | Custom |
| Deployment | Cloud or self-hosted |
| SSO | SAML + SCIM provisioning |
| Audit logs | Full export |
| Data residency | Negotiable |
| SLA | 99.9% uptime, custom SLA |
| Support | Dedicated CSM + Slack + 2h SLA |
| Contract | Annual MSA |

**Minimum contract:** $2,000/month ($24,000/year)

---

## Overage pricing

For Growth and Team tiers, overage runs are billed at:
- **$0.02 per run** over the monthly limit
- Overage is capped at 2x the included run count by default (configurable)
- Hard cap available on request (no overage, just blocked when limit hit)

---

## Unit economics

### COGS per run estimate

| Component | Estimated cost per run |
|---|---|
| Azure Container Apps Job (Playwright, 10min max) | ~$0.015 |
| Azure Service Bus messages | ~$0.0001 |
| Azure Blob Storage (screenshots + traces) | ~$0.002 |
| Azure PostgreSQL (small instance, amortized) | ~$0.001 |
| Azure OpenAI tokens (plan + summary, ~2,000 tokens) | ~$0.006 |
| App Insights + bandwidth | ~$0.001 |
| **Total COGS per run** | **~$0.025** |

### Margin analysis

| Tier | Price | Included runs | Revenue per run | COGS per run | Gross margin |
|---|---|---|---|---|---|
| Free | $0 | 50 | $0 | $0.025 | Loss leader |
| Starter | $29 | 500 | $0.058 | $0.025 | ~57% |
| Growth | $99 | 3,000 | $0.033 | $0.025 | ~24% |
| Team | $299 | 10,000 | $0.030 | $0.025 | ~17% |

**Notes:**
- Growth and Team margins improve significantly with higher Azure reserved capacity discounts
- AI token cost drops with prompt optimization and caching (target: < $0.003/run by Phase 4)
- Free tier is subsidized by paid tiers — cap free to 50 runs strictly
- COGS target: < $0.02/run by Month 6 through optimization

---

## Revenue model

### Primary: SaaS subscriptions
Recurring monthly/annual subscription. The dominant revenue stream.

### Secondary: Overage billing
Per-run fees above the monthly limit. Requires Stripe metered billing integration.

### Future: Enterprise custom contracts
Annual MSAs, negotiated run volumes, self-hosted licensing fee.

### Not pursuing (v1)
- Marketplace revenue share (GitHub takes 25% — avoid until forced)
- Usage-based-only pricing (too unpredictable for customers at this stage)
- Freemium with feature gates only (run limits are cleaner for this product)

---

## Billing implementation

### Payment processor: Stripe

| Feature | Implementation |
|---|---|
| Subscription management | Stripe Billing (recurring plans) |
| Metered overage | Stripe metered billing on run count |
| Free → paid upgrade | In-app upgrade button + PR comment CTA |
| Annual billing | Stripe annual subscription with upfront charge |
| Failed payment | Stripe dunning → downgrade to Free after 7 days grace |
| Cancellation | Self-serve in dashboard, downgrade to Free at period end |
| Invoicing | Stripe-generated PDF invoices |

### Billing integration points in the product
- Run creation checks `installation.tier` and `installation.runs_this_month`
- If limit reached: block run, post PR comment with upgrade CTA, return `blocked_quota` status
- Stripe webhook updates `installation.tier` on subscription events
- Usage counter reset on monthly billing cycle date

---

## Revenue targets

| Month | Target MRR | Notes |
|---|---|---|
| Month 1 (post-launch) | $500 | 2–3 Starter paying customers from design partners |
| Month 2 | $1,500 | Product Hunt + HN installs converting |
| Month 3 | $3,000 | Waitlist converts, first Growth tier customers |
| Month 6 | $10,000 | Mix of Starter + Growth + first Team |
| Month 12 | $30,000 | Growth + Team dominant, first Enterprise conversations |

### Path to $10K MRR
- 10 Growth customers ($99 × 10 = $990 MRR)
- 20 Starter customers ($29 × 20 = $580 MRR)
- 3 Team customers ($299 × 3 = $897 MRR)
- 1 small Enterprise ($2,000 MRR)
- Overage billing: ~$500 MRR
- **Total: ~$5,000 MRR** — conservative path to $10K requires more Growth/Team customers or Enterprise

**$10K MRR realistic with:** 30 Growth + 5 Team + overages. Achievable by Month 9–12 post-launch.

---

## Pricing review schedule

| Trigger | Action |
|---|---|
| After first 20 paying customers | Review tier limits vs. actual usage patterns |
| After 3 months post-launch | Review COGS vs. margin — adjust overage pricing if needed |
| First Enterprise inquiry | Finalize Enterprise pricing and MSA template |
| $30K MRR | Consider adding a mid-tier between Growth and Team |
