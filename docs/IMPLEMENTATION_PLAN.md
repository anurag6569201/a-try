# Implementation Plan

## Planning assumption

This plan assumes:
- 1–2 strong engineers
- a TypeScript monorepo
- one initial internal repo for dogfooding
- GitHub + Vercel + Azure already available

---

## Delivery strategy

Build in phases:

1. **Foundation**
2. **Deterministic preview QA alpha**
3. **Instruction-driven beta**
4. **Reliability + security hardening**
5. **Repo-aware intelligence**
6. **Launch preparation**

The main rule:
**Do not build advanced repo intelligence before the basic preview QA loop is reliable.**

---

## Timeline overview

| Phase | Outcome | Estimated duration |
|---|---|---|
| Phase 0 | contracts, docs, repo skeleton, infra baseline | 1 week |
| Phase 1 | internal alpha: preview resolution + smoke runner | 2 weeks |
| Phase 2 | structured PR instructions + reporting | 2 weeks |
| Phase 3 | hardening, auth profiles, observability, security | 2–3 weeks |
| Phase 4 | repo-aware intelligence and retrieval | 2–3 weeks |
| Phase 5 | multi-tenant launch readiness | 3+ weeks |

---

## Phase 0 — Foundation

### Objective
Create the repo, contracts, and infrastructure baseline.

### Deliverables
- monorepo skeleton
- docs in place
- Terraform baseline
- GitHub App created
- Azure resources created
- local dev environment
- PR template committed

### Acceptance criteria
- webhook endpoint can receive and validate GitHub events
- a fake PR event can be stored as a run
- repo docs define product boundaries clearly

---

## Phase 1 — Deterministic preview QA alpha

### Objective
Prove the core loop:
PR event -> preview URL -> Playwright smoke run -> GitHub result.

### Deliverables
- PR open/sync webhook intake
- preview URL resolution from Vercel/GitHub deployment data
- queue + orchestrator
- runner container with Playwright
- default smoke plan
- sticky PR comment
- GitHub Check updates
- artifact upload

### Acceptance criteria
- on PR open, system creates a run
- if preview is ready, smoke run executes automatically
- if preview is not ready, run waits and retries
- result appears in PR with screenshot/trace links
- superseded SHA cancels old run cleanly

---

## Phase 2 — Instruction-driven beta

### Objective
Use structured PR instructions as the testing contract.

### Deliverables
- PR body marker extraction
- YAML schema validation
- instruction-to-plan normalization
- `instruction` and `hybrid` modes
- parse error reporting
- rerun command `/qa rerun`
- `/qa smoke` command

### Acceptance criteria
- valid QA block becomes executable plan
- invalid block produces clear PR guidance
- hybrid mode runs explicit tests plus smoke
- pass/fail/blocked outcomes are clearly classified

---

## Phase 3 — Reliability, auth, and security hardening

### Objective
Make the system safe and stable enough for broader internal use.

### Deliverables
- login profile support
- repo policy controls
- fork PR restrictions
- structured logging and tracing
- alerting
- retry policy
- failure taxonomy
- cost controls
- timeout handling
- artifact retention policy

### Acceptance criteria
- authenticated runs work for trusted same-repo PRs
- fork PRs are safely limited
- common transient failures retry correctly
- false platform-failure rate drops below target
- App Insights dashboards show end-to-end run traces

---

## Phase 4 — Repo-aware intelligence

### Objective
Improve plan quality and risk awareness using repo context.

### Deliverables
- changed-file heuristics
- route/component mapping where practical
- `pgvector` retrieval for past runs/docs if needed
- AI-assisted missing test suggestion
- optional LangGraph for multi-step planner/analyst orchestration

### Acceptance criteria
- planner can suggest relevant additional smoke checks for changed routes
- historical failures can inform risk summaries
- prompt regressions are tested before rollout

### Important note
Do **not** add Neo4j or tree-sitter/SCIP until simpler heuristics clearly stop being enough.

---

## Phase 5 — Launch readiness

### Objective
Prepare for real external usage.

### Deliverables
- multi-installation GitHub App support
- onboarding flow
- billing/plan hooks later if needed
- rate limits
- per-repo config management
- support runbooks
- SLA/SLO dashboard
- security review
- usage analytics

### Acceptance criteria
- multiple repos/installations can run independently
- noisy repos cannot starve other customers
- secrets and retention policies are reviewed
- launch checklist is complete

---

## Milestones

### M1 — Internal alpha
- one internal repo
- smoke only
- preview detection stable
- evidence visible in PR

### M2 — Internal beta
- structured instructions
- reruns
- auth profiles for trusted previews
- failure classification usable by reviewers

### M3 — Private beta
- 3–5 repos
- multiple workflows/day
- alerting and runbooks active
- false-failure rate acceptable

### M4 — Launch candidate
- security reviewed
- onboarding documented
- multi-tenant concerns addressed
- supportable by a small team

---

## Prioritized backlog

### P0 — must build first
- create GitHub App
- create Terraform baseline
- create webhook receiver
- create normalized run model
- implement preview resolution
- build Playwright runner image
- implement artifact upload
- implement sticky PR comment
- implement GitHub Check updates
- implement smoke mode

### P1 — required for strong beta
- structured QA block parser
- YAML schema validation
- instruction mode
- hybrid mode
- rerun commands
- login profiles
- retry + timeout policy
- App Insights dashboards
- fork PR policy enforcement

### P2 — valuable after reliability is proven
- richer AI failure summaries
- route-aware smoke suggestions
- `pgvector` retrieval
- LangGraph orchestration
- dashboard UI
- historical analytics
- visual diff layer

### P3 — only after traction
- tree-sitter
- SCIP/LSIF
- Neo4j
- OpenSearch
- AKS
- ArgoCD
- Temporal

---

## Decision gates

### Gate A — after Phase 1
If preview resolution and runner stability are weak, do not add more AI features yet.

### Gate B — after Phase 2
If structured instructions are not being used by developers, improve template/UX before building deeper intelligence.

### Gate C — after Phase 3
If internal usage is strong and stable, start multi-tenant work.

### Gate D — after Phase 4
Only invest in graph/indexing tech if it measurably improves:
- plan quality
- defect catch rate
- review usefulness

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Preview not ready or unstable | wait state, retry, blocked classification |
| Browser flakiness | deterministic selectors, traces, bounded retry |
| Auth failures | login profiles, sandbox accounts, clear error reporting |
| Fork PR credential exfiltration | disable authenticated fork runs by default |
| Developers do not fill instructions | strong PR template + smoke fallback |
| AI summaries are noisy | golden tests + prompt regression |
| Cost grows too fast | timeouts, concurrency caps, smaller model for simple tasks |

---

## Launch bar

Do not call the product launch-ready until all are true:

- at least 50 real internal PR runs completed
- preview resolution success is consistently high
- platform-induced false failures are below target
- fork PR policy is enforced
- artifacts and logs are reliable
- support/debugging workflow is documented
- multiple repos can onboard with predictable setup