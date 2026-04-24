# Operations and Security

## Goal

Run Preview QA Agent safely in production, especially because it interacts with:

- untrusted PR text
- untrusted preview deployments
- browser sessions
- potentially sensitive app flows

---

## Environment strategy

| Environment | Purpose |
|---|---|
| `local` | developer iteration with mocks or local fixture app |
| `dev` | internal integration testing |
| `staging` | pre-production validation |
| `prod` | real repo installations and customer usage |

Each environment should have:
- separate Azure resources where practical
- separate GitHub App config if needed
- separate Vercel tokens or scopes if applicable
- separate sandbox test accounts

---

## Secrets and credentials

Store secrets in Azure Key Vault.

Examples:
- GitHub App private key
- Vercel API token
- preview bypass token if Vercel protection is enabled
- auth profile credentials or storage state references
- DB connection strings if not using managed identity

### Rules
- do not place secrets in PR bodies
- do not log secrets
- do not expose secrets to models
- rotate credentials periodically
- prefer managed identity where possible

---

## Critical security policy: fork PRs

Fork PR previews are **untrusted**.
If the preview runs code from a fork, that code can attempt credential exfiltration.

### Default policy
- allow unauthenticated smoke only
- block authenticated runs
- mark as `needs_human` or downgraded mode when needed

### Only allow authenticated fork runs if all are true
- explicit admin opt-in
- disposable low-privilege test accounts
- sandbox/non-production data only
- strong network and secret isolation

If unsure, block it.

---

## Preview environment prerequisites

To safely and reliably test previews, target repos should provide:

- sandbox or seeded preview data
- non-production test accounts
- stable selectors (`data-testid`)
- preview domains accessible from runner jobs
- auth flows compatible with automation
- bot protection disabled or bypassable in preview if required
- no dependency on production-only secrets for core flows

---

## Prompt and input safety

Treat all of the following as untrusted input:

- PR titles
- PR descriptions
- issue comments
- diff content
- page DOM text
- console output
- network errors

### Mitigations
- keep system prompts static and code-owned
- do not allow arbitrary tool invocation from user text
- use narrow structured parsing before LLM reasoning
- separate plan generation from execution
- redact sensitive values before logging or summarization
- do not echo secrets in comments or artifacts

---

## Browser runner isolation

Each browser run should be isolated:

- ephemeral container/job
- clean browser context
- minimal secret injection
- scoped credentials only for the required profile
- bounded timeout
- no persistent shared session unless intentionally managed

Prefer:
- storage-state based login for trusted same-repo previews
- least-privilege accounts
- sandbox test data

---

## Observability

### Logs
Capture:
- run lifecycle events
- preview resolution attempts
- parser/validation outcomes
- runner start/finish
- artifact upload results
- GitHub reporting results

### Metrics
Track:
- run count
- success/failure/blocked rates
- preview resolution latency
- run duration
- timeout rate
- retry rate
- false platform-failure rate
- cost per run estimate

### Traces
Use correlation IDs across:
- webhook request
- queue message
- orchestrator workflow
- runner job
- reporter actions

Use App Insights + OpenTelemetry.

---

## Suggested SLIs / SLOs

| Metric | Target |
|---|---|
| webhook acknowledge p95 | < 2 seconds |
| queue-to-orchestrator start p95 | < 60 seconds |
| preview-ready to first result p90 | < 10 minutes |
| artifact upload success | > 99% |
| preview resolution success | > 95% |
| platform-induced false failure rate | < 5% |

---

## Alerting

Create alerts for:
- webhook signature validation failures spike
- preview resolution failure spike
- runner crash loop
- artifact upload failures
- Key Vault secret access failures
- DB connection saturation
- unusual rerun volume
- high timeout rate

---

## Cost controls

Because browser runs and LLM calls can become expensive, enforce:

- default max runtime per run
- default max cases per PR in v1
- concurrency caps per installation/repo
- one sticky comment instead of many comments
- use smaller models for classification/extraction
- capture video only on failure or debug mode
- cap automatic retries

Your Azure credits are useful, but cost discipline should still be designed in from day 1.

---

## Data retention

Suggested defaults:

| Data | Retention |
|---|---|
| run metadata | 90 days |
| screenshots | 30 days |
| traces | 14 days |
| videos | 14 days |
| raw logs | 30 days |
| audit events | 90+ days depending on compliance needs |

Tune later by customer tier or internal need.

---

## PII and sensitive data

Avoid storing:
- raw passwords
- full cookies
- personal user content from previews unless necessary
- full form payloads in logs

Redact:
- email addresses if possible
- tokens
- auth headers
- cookie values

---

## GitHub App permissions

Expected minimum permissions likely include:
- Pull requests: read/write
- Issues: write (for PR comments if needed)
- Checks: read/write
- Contents: read
- Metadata: read
- Commit statuses: read/write
- Deployments: read

Keep permissions as small as possible.

---

## Incident classes

### Sev 1
- secret leakage
- authenticated fork preview execution bypass
- widespread wrong PR status updates
- data exposure in artifacts

### Sev 2
- high run failure rate
- widespread preview resolution failures
- severe comment/reporting inconsistency

### Sev 3
- individual repo misconfiguration
- flaky runner behavior
- isolated artifact upload issues

---

## Runbooks to define

Create short operational runbooks for:
- preview not found
- GitHub App auth failure
- Vercel token failure
- runner crash
- stuck queue
- high timeout rate
- noisy repo or abusive reruns
- bad rollout of prompt/planner changes

---

## LLM evaluation and quality tracking

Start simple:
- log planner input/output metadata
- keep golden PR fixtures
- run regression tests before prompt changes

Later add:
- Langfuse for prompt traces
- promptfoo or similar for regression suites
- human review sampling of failed runs
- usefulness scoring from internal users

---

## Safe rollout policy

When changing:
- parser contract
- plan generation
- auth handling
- runner behavior
- summarization prompts

Use:
- staged rollout
- feature flags where practical
- internal repo canary first
- rollback path

---

## Final operational principle

Reliability and safety matter more than automation coverage.

A smaller set of trustworthy preview checks is better than a broad agent that is hard to trust.