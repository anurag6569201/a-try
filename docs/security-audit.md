# Security Audit — Sprint 5.5

## Secrets Audit

**Finding: No hardcoded credentials in source.**

All secrets are loaded at runtime via `requireEnv()`:
- `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY` — loaded in orchestrator and webhook-api entrypoints
- `VERCEL_API_TOKEN` — loaded in orchestrator entrypoint
- `SERVICE_BUS_CONNECTION_STRING` — loaded in orchestrator entrypoint
- `STRIPE_WEBHOOK_SECRET` — loaded in webhook-api Stripe handler
- `DATABASE_URL` / `DB_CONNECTION_STRING` — loaded in db package client

**Finding: Secret redaction in reporter is active.**

`packages/reporter/src/redact.ts` scans all PR comment bodies before posting for:
- Azure SAS tokens (`sig=...`)
- Generic API keys/tokens (`key: "..."`, `token: "..."`)
- Azure connection strings (`AccountKey=...`)
- GitHub personal access tokens (`ghp_*`, `ghs_*`)
- JWT tokens (header.payload.signature pattern)

## Fork Policy Audit

**Finding: Fork policy correctly enforced.**

- `pull_request.head.repo.fork` is read from the immutable GitHub webhook payload
- Fork PRs are downgraded to `RunMode.Smoke` in `apps/orchestrator/src/handlers/pullRequest.ts:63`
- Login profile credential access is blocked for fork PRs (line 218)
- AI plan suggestion calls are skipped for fork PRs (line 246)
- Every fork policy decision writes an `audit_event` row with `event_type = 'fork_policy.downgrade'`
- Integration tests in `apps/orchestrator/src/__tests__/forkPolicy.test.ts` verify this path

**Independent verification:**
Fork PR → smoke-only run. Auth runs blocked. Audit event written. ✓

## Dependency Vulnerability Scan

Run: `pnpm audit`

**Result after patching:**
- 0 critical
- 0 high (patched via `pnpm.overrides.glob >= 11.1.0`)
- 4 moderate (all in dev/test tooling — vitest/vite/esbuild, Azure SDK transitive uuid)

**Moderate CVEs — risk assessment:**
| Package | Path | Production exposure | Action |
|---------|------|---------------------|--------|
| esbuild ≤0.24.2 | vitest → vite → esbuild | Dev only | Monitor for vitest upgrade |
| vite ≤6.4.1 | vitest → vite | Dev only | Monitor for vitest upgrade |
| uuid <14.0.0 | @azure/identity → @azure/msal-node → uuid | Azure SDK internal use only | Monitor for Azure SDK update |

None of the moderate CVEs affect production code paths.

## GitHub App Permission Audit

Minimum required permissions (verify in GitHub App settings):
- `pull_requests`: read/write — required for PR comments and checks
- `issues`: write — required for issue comments (`/qa` commands)
- `checks`: read/write — required for GitHub Checks
- `contents`: read — required for file content reads (onboarding checklist)
- `metadata`: read — required (mandatory for all GitHub Apps)
- `commit_statuses`: read/write — required for deployment status events
- `deployments`: read — required for Vercel preview URL detection

**No permissions beyond this list should be granted.**

## Input Sanitization

- PR title, body, and comment text are treated as untrusted before any LLM call
- HTML is escaped in all dashboard views (`escapeHtml()` in `apps/dashboard/src/views/layout.ts`)
- YAML instructions are parsed and validated against Zod schemas before execution
- Webhook signatures are verified via HMAC-SHA256 before any payload processing

## Runbooks

Five operational runbooks are located in `docs/runbooks/`:
1. `01-bad-prompt-rollout.md` — AI prompt regression response
2. `02-false-failure-spike.md` — false failure rate investigation
3. `03-fork-policy-bypass-attempt.md` — fork security incident response
4. `04-high-timeout-rate.md` — preview/runner timeout investigation
5. `05-noisy-repo.md` — tenant abuse and rate-limit enforcement
