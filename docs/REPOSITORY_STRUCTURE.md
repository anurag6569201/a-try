# Repository Structure

## Goal

Define a monorepo structure that is:

- easy for coding agents to navigate
- cleanly separated by responsibility
- scalable from v1 to multi-tenant product
- testable and maintainable

---

## Recommended monorepo layout

```text
/
├─ AGENTS.md
├─ apps/
│  ├─ webhook-api/
│  ├─ orchestrator/
│  ├─ browser-runner/
│  └─ dashboard/                # later phase
├─ packages/
│  ├─ domain/
│  ├─ schemas/
│  ├─ config/
│  ├─ db/
│  ├─ github-adapter/
│  ├─ vercel-adapter/
│  ├─ parser/
│  ├─ planner/
│  ├─ reporter/
│  ├─ runner-playwright/
│  ├─ ai/
│  ├─ observability/
│  └─ shared/
├─ fixtures/
│  └─ preview-app/              # local app for Playwright and parser testing
├─ infra/
│  └─ terraform/
├─ docs/
└─ .github/
   └─ PULL_REQUEST_TEMPLATE.md
```

---

## App responsibilities

### `apps/webhook-api`
Responsibilities:
- receive GitHub webhooks
- validate webhook signatures
- normalize inbound events
- enqueue work
- provide lightweight health endpoints

Do not place business orchestration logic here.

### `apps/orchestrator`
Responsibilities:
- consume queued events
- own workflow state machine
- resolve preview URL
- invoke parser, planner, runner, reporter
- manage retries and cancellation

This is the central control-plane app.

### `apps/browser-runner`
Responsibilities:
- entrypoint for job-style Playwright execution
- read plan + runtime config
- run browser flow
- emit structured result
- upload artifacts

Keep this isolated and minimal.

### `apps/dashboard`
Later phase:
- internal admin/debugging UI
- installation view
- run history
- artifact browsing
- repo config management

---

## Package responsibilities

### `packages/domain`
- core types
- enums
- state machine values
- run/result models
- business policies

Should not depend on vendor SDKs.

### `packages/schemas`
- Zod schemas
- webhook payload validation
- PR instruction validation
- config schema validation

### `packages/config`
- centralized config loading
- environment variable parsing
- typed runtime config
- per-env defaults

### `packages/db`
- database schema
- repositories
- migrations
- query helpers

### `packages/github-adapter`
- Octokit wrapper
- GitHub Check updates
- PR comment create/update
- installation token handling

### `packages/vercel-adapter`
- Vercel API wrapper
- preview lookup
- deployment metadata normalization

### `packages/parser`
- PR body marker extraction
- YAML parse + validation
- normalized instruction AST

### `packages/planner`
- convert validated instructions into executable plan
- apply mode rules
- merge smoke/default cases
- enrich metadata

### `packages/reporter`
- comment formatting
- check summary formatting
- result classification rendering

### `packages/runner-playwright`
- Playwright action executor
- selector helpers
- auth/session bootstrap
- artifact capture
- trace and timeout handling

### `packages/ai`
- prompt templates
- model adapters
- summarization logic
- future planner/analyst orchestration

### `packages/observability`
- logging setup
- tracing helpers
- metric emitters
- correlation ID utilities

### `packages/shared`
- generic utilities
- error helpers
- common result wrappers

---

## Dependency rules

### Allowed direction
- apps -> packages
- adapter packages -> domain/schemas/shared
- planner/reporter/runner -> domain/schemas/shared/config
- db -> domain/shared
- ai -> domain/schemas/shared/config

### Not allowed
- domain -> adapters
- schemas -> app code
- runner -> webhook-specific logic
- parser -> GitHub SDK
- reporter -> direct DB access unless explicitly needed

---

## Code placement rules

### Put in `domain`
- run states
- result categories
- business invariants

### Put in `schemas`
- PR instruction YAML schema
- webhook event schema
- repo config schema

### Put in `parser`
- extraction from PR markdown
- conversion from YAML to validated object

### Put in `planner`
- translation from validated object to execution plan

### Put in `runner-playwright`
- executable browser steps
- page interaction utilities
- auth/session setup

### Put in `reporter`
- stable text/markdown generation for GitHub outputs

---

## Reserved config files

### Repo-level config path
Use this path in onboarded repos later:

`.previewqa/config.yaml`

### Example repo config
```yaml
version: 1

preview:
  provider: vercel
  resolution: deployment_status

qa:
  default_mode: smoke
  require_structured_instructions: false
  authenticated_runs:
    enabled: true
    fork_policy: unauthenticated_only

auth:
  login_profiles:
    - name: standard-user
      type: storage_state
      secret_ref: previewqa-standard-user-storage-state

runner:
  timeout_seconds: 600
  capture_video_on_failure: true
  capture_trace: true

smoke:
  routes:
    - /
    - /dashboard
```

This file is not mandatory for the earliest alpha, but the structure should be planned now.

---

## Testing layout

Recommended approach:
- unit tests colocated with packages
- integration tests in each package or app
- runner tests against `fixtures/preview-app`
- golden fixtures for:
  - PR descriptions
  - parsed outputs
  - planned cases
  - GitHub comments

---

## Documentation rules

Each app and important package should eventually contain a small `README.md` with:
- purpose
- inputs
- outputs
- dependencies
- local run command

---

## Build and workspace tools

Recommended:
- pnpm workspaces
- Turborepo
- strict TypeScript config
- ESLint + Prettier
- Vitest or Jest for unit/integration tests

---

## Why this structure works

This structure keeps the core workflow explicit:

- webhook ingestion
- orchestration
- parsing
- planning
- execution
- reporting

That makes it easier for both humans and coding agents to implement safely.