# Milestones, Decision Gates & Backlog

## Milestone map

```
Phase 0 ──── Phase 1 ──── Phase 2 ──── Phase 3 ──── Phase 4 ──── Phase 5
                M1           M2           M3                        M4
           Internal       Internal     Private                   Launch
             Alpha          Beta         Beta                   Candidate
           (Week 6)      (Week 10)    (Week 14)               (Week 24+)
```

---

## M1 — Internal Alpha (end of Phase 1, ~Week 6)

### What it means
The core loop works end-to-end on one internal repo.

### Must be true
- One internal repo is onboarded and running
- On PR open or sync, a run is created automatically
- Smoke run executes against the Vercel preview
- If preview is not ready, system waits and retries correctly
- Screenshot and trace are available in the PR comment
- GitHub Check shows pass or fail
- Superseded commits cancel old runs without manual intervention

### Does not require
- YAML instruction parsing
- AI summaries
- Auth login profiles
- Multiple repos
- Any paying customers

### Owner action after M1
Run a retrospective on the smoke run. Is preview resolution reliable? Are artifacts useful to reviewers?
If not → fix reliability before advancing to Phase 2.

---

## M2 — Internal Beta (end of Phase 2, ~Week 10)

### What it means
Developers are actively using structured QA blocks in PR descriptions.

### Must be true
- Valid YAML QA block in PR description → runs as explicit test plan
- Invalid QA block → clear parse error posted to PR with guidance
- Hybrid mode: explicit steps + smoke fallback both run
- `/qa rerun` and `/qa smoke` commands work from PR comments
- Auth login profiles resolve credentials from Key Vault for trusted PRs
- AI failure summaries appear in the PR comment on failure
- Failure is classified: `product_bug | test_bug | environment_issue | flaky | needs_clarification`

### Does not require
- Multiple external repos
- Billing or rate limits
- Full observability dashboards
- Security review

### Owner action after M2
Survey internal developers: are QA blocks being used? Are failures trustworthy?
Gate B: If structured instructions are not being filled by developers, improve PR template and UX before building deeper intelligence.

---

## M3 — Private Beta (end of Phase 3, ~Week 14)

### What it means
The system is stable and safe for 3–5 repos running real workloads.

### Must be true
- 3–5 repos onboarded (can be external design partners)
- Multiple workflows per day across repos
- Platform-induced false failure rate < 5%
- Fork PR policy enforced — authenticated runs blocked on fork PRs
- Alerting active: on-call team gets paged for Sev 1/Sev 2 incidents
- Runbooks exist for top 5 failure scenarios
- Artifact and log retention policies enforced
- App Insights dashboards show end-to-end traces per run

### Owner action after M3
Gate C: If internal usage is strong and stable → start multi-tenant work (Phase 5).
If false failure rate is still too high → prioritize reliability before launch prep.

---

## M4 — Launch Candidate (end of Phase 5, ~Week 24+)

### What it means
The product is ready for public launch and paying customers.

### Must be true (launch bar — all required)
- ≥ 50 real internal PR runs completed successfully
- Preview resolution success rate consistently > 95%
- Platform-induced false failure rate < 5%
- Fork PR policy enforced and independently tested
- Artifacts and logs reliably available for every run
- Multiple repos can onboard with predictable, documented setup
- Support and debugging workflow fully documented (10 runbooks)
- Security review passed (secrets, fork policy, dependency audit)
- Billing tier enforcement working (run limits, repo limits)
- GitHub Marketplace listing live
- Pricing page live
- Onboarding flow tested end-to-end

---

## Decision gates

### Gate A — After Phase 1 (before starting Phase 2)
**Question:** Is preview resolution reliable and is the smoke runner stable?

| Signal | Decision |
|---|---|
| Preview resolution > 95%, smoke runs succeed > 90% | ✅ Advance to Phase 2 |
| Preview resolution < 80% or frequent runner crashes | 🔁 Fix reliability first |

### Gate B — After Phase 2 (before starting Phase 3)
**Question:** Are developers using structured QA blocks?

| Signal | Decision |
|---|---|
| > 70% of PRs on onboarded repos have valid QA blocks | ✅ Advance to Phase 3 |
| < 40% adoption — developers not filling the block | 🔁 Improve PR template, onboarding, and UX |

### Gate C — After Phase 3 (before starting Phase 5)
**Question:** Is internal usage strong and stable enough to open to external customers?

| Signal | Decision |
|---|---|
| False failure rate < 5%, internal NPS > 4/5, no Sev 1 incidents | ✅ Start multi-tenant Phase 5 |
| Reliability issues ongoing | 🔁 Continue hardening |

### Gate D — After Phase 4 (before adopting advanced tech)
**Question:** Do heuristics and `pgvector` retrieval measurably improve plan quality?

| Signal | Decision |
|---|---|
| Defect catch rate improves, false suggestions < 10% | ✅ Continue repo intelligence investment |
| No measurable quality improvement | 🛑 Do not invest in tree-sitter, SCIP, Neo4j |

---

## Prioritized backlog

### P0 — Must build first (Phase 0–1)
- [ ] Register GitHub App
- [ ] Create Terraform baseline (all Azure resources)
- [ ] Scaffold monorepo (pnpm + Turborepo + TypeScript)
- [ ] Implement webhook receiver + signature validation
- [ ] Create normalized run model in DB
- [ ] Implement preview URL resolution (Vercel API + deployment events)
- [ ] Build Playwright runner Docker image
- [ ] Implement artifact upload to Azure Blob
- [ ] Implement sticky PR comment upsert
- [ ] Implement GitHub Check create/update
- [ ] Implement smoke mode (default plan)
- [ ] Implement superseded SHA cancellation

### P1 — Required for strong beta (Phase 2–3)
- [ ] Structured QA block parser (marker extraction + YAML parse)
- [ ] Zod schema validation for PR instructions
- [ ] Instruction mode
- [ ] Hybrid mode
- [ ] `/qa rerun` and `/qa smoke` commands
- [ ] Login profiles (Key Vault credential resolution)
- [ ] AI failure summaries (Azure OpenAI)
- [ ] Failure taxonomy classification
- [ ] Retry + timeout policy
- [ ] Fork PR policy enforcement
- [ ] App Insights dashboards
- [ ] Alerting (8 alert rules)
- [ ] Cost controls (concurrency caps, video on failure only)
- [ ] Artifact retention policy

### P2 — Valuable after reliability is proven (Phase 4)
- [ ] Changed-file heuristics → route mapping
- [ ] AI-assisted missing test suggestions
- [ ] `pgvector` retrieval for past runs
- [ ] LangGraph orchestration (if needed)
- [ ] Dashboard UI (`apps/dashboard`)
- [ ] Historical quality analytics per repo
- [ ] Visual diff layer (screenshot comparison)
- [ ] Prompt regression test suite (golden fixtures)

### P3 — Only after traction is proven
- [ ] tree-sitter route/component extraction
- [ ] SCIP / LSIF symbol-level impact analysis
- [ ] Neo4j knowledge graph
- [ ] OpenSearch hybrid search
- [ ] AKS + ArgoCD
- [ ] Temporal long-running workflows
- [ ] Mobile web testing
- [ ] Self-hosted enterprise deployment
