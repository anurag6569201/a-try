# AGENTS.md

## Mission

Build **Preview QA Agent**: a GitHub-native PR QA system that:

1. reads structured QA instructions from a PR
2. finds the Vercel preview deployment for that PR
3. executes deterministic Playwright validation against that preview
4. posts an auditable result back to the PR
5. later adds AI-assisted planning, impact analysis, and test recommendation

---

## Current product focus

The active target is a **launchable v1**:

- GitHub App integration
- Vercel preview detection
- structured PR instruction parsing
- deterministic Playwright execution
- Azure OpenAI planning and summarization
- Azure-native storage, secret management, and observability

Do **not** prematurely optimize v1 with:

- AKS
- ArgoCD
- Neo4j
- OpenSearch
- Temporal

Those belong to later phases unless the docs explicitly move the project there.

---

## Product boundaries

### In scope
- PR-triggered preview QA
- Vercel preview URL discovery
- browser execution against preview deployments
- screenshots, traces, and logs
- sticky PR comments + GitHub Check status updates
- comment-based reruns
- structured PR instructions
- repo-level config later
- internal alpha -> private beta -> commercializable SaaS path

### Out of scope for now
- generic codebase chat assistant
- full replacement for human code review
- autonomous browser exploration with no constraints
- mobile device lab on day 1
- full cross-browser matrix on day 1
- deep knowledge graph on day 1
- enterprise billing/admin console on day 1

---

## Golden implementation rules

- Prefer **deterministic execution** over free-form browser agency.
- The LLM **plans and summarizes**; Playwright **executes**.
- Every external integration must go through an adapter package.
- Every inbound payload must be schema-validated.
- Every run must be idempotent by:
  - installation
  - repository
  - PR number
  - head SHA
  - mode
- Every run must persist:
  - status
  - timestamps
  - test plan
  - normalized results
  - artifacts
  - failure category
- If instructions are ambiguous, return `NEEDS_HUMAN` or request clarification.
- Never use production URLs or production credentials by default.
- Fork PRs are untrusted. Do not use authenticated flows on fork previews unless explicitly allowed by policy.
- Any workflow change must update `docs/WORKFLOWS.md`.
- Any contract change must update `docs/PR_INSTRUCTIONS_SPEC.md`.

---

## Preferred implementation stack

### Language and runtime
- TypeScript
- Node.js 20+
- pnpm
- Turborepo

### Key libraries
- Zod for validation
- Octokit for GitHub API
- Playwright for browser automation
- Pino or structured JSON logging
- OpenTelemetry for traces

### Azure
- Azure Functions for webhook intake
- Azure Service Bus for job/event queueing
- Azure Container Apps for orchestration services
- Azure Container Apps Jobs for ephemeral Playwright runners
- Azure AI Foundry / Azure OpenAI for model access
- Azure Database for PostgreSQL for state
- `pgvector` only when retrieval becomes needed
- Azure Blob Storage for artifacts
- Azure Key Vault for secrets
- Azure Application Insights for observability

### Infra
- Terraform

---

## Required reading order

1. `docs/PRODUCT_OVERVIEW.md`
2. `docs/ARCHITECTURE.md`
3. `docs/WORKFLOWS.md`
4. `docs/PR_INSTRUCTIONS_SPEC.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `docs/REPOSITORY_STRUCTURE.md`
7. `docs/OPERATIONS_AND_SECURITY.md`

---

## Coding rules

- Keep domain logic separate from vendor adapters.
- Do not embed prompts directly inside HTTP handlers or queue consumers.
- Centralize prompt definitions in a dedicated AI package.
- Do not read `process.env` throughout the codebase; centralize config loading.
- Use explicit enums/discriminated unions for run states and result types.
- PR instruction parsing must be versioned.
- Reporter output must be stable enough for snapshot testing.
- Browser actions should prefer `data-testid`; accessible-role selectors are second choice.
- Fail closed on ambiguity.
- Favor small composable services and packages over one giant app.

---

## Testing expectations

### Unit tests
- PR body parser
- YAML instruction validation
- planner transformation logic
- GitHub comment formatting
- workflow state transitions

### Integration tests
- GitHub adapter
- Vercel adapter
- DB repository layer
- artifact storage layer

### Runner tests
- Playwright execution against a local fixture app
- timeout and retry behavior
- screenshot/trace/video capture

### Golden tests
- PR body -> parsed instruction set -> normalized plan
- failure summary generation
- comment formatting snapshots

### Regression tests
- prompt and planning regressions before changing planner/summarizer prompts

---

## Definition of done

A task is not complete unless:

- code is implemented
- tests exist
- logs/metrics/traces are added where relevant
- docs are updated
- failure modes are handled
- output is safe for untrusted inputs
- reviewer can understand the behavior from code + docs alone

---

## When in doubt

If implementation choices conflict with simplicity vs sophistication, choose the option that improves:

1. reliability
2. auditability
3. product launch speed
4. safety on untrusted preview deployments

Only then optimize for sophistication.