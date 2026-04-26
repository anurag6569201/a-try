# Phase 2 — Architecture Diagram

## Data flow: AI Code Review

```
GitHub PR opened/synchronize
        │
        ▼
POST /webhooks/github (apps/api)
        │
        ├──► INSERT run (state=queued)        [existing]
        │
        └──► Service Bus: publish "pr.review" [NEW SC-6]
                  │
                  ▼
        Orchestrator: handlePrReview()        [NEW SC-5]
                  │
                  ├── github-adapter.getDiff()
                  ├── github-adapter.getChangedFiles()
                  │
                  ▼
        code-reviewer.reviewPR()              [NEW SC-2]
                  │
          ┌───────┼───────┐
          │       │       │
        review  security coverage
        prompt  prompt   prompt
          │       │       │
          └───────┼───────┘
                  │ (parallel OpenAI calls with structured output)
                  ▼
        ReviewOutput {findings[], securityFindings[], missingCoverage[]}
                  │
                  ├── upsert review_record (DB)
                  ├── github-adapter.createOrUpdateReview()    ← inline annotations
                  └── github-adapter.createOrUpdateStickyComment() ← summary comment
```

## Data flow: PreviewQA Execution

```
run (state=queued) in DB
        │
        ▼
Orchestrator: handleRun()                [NEW SD-3]
        │
        ▼ state = waiting_for_preview
        │
        ├── vercel-adapter.resolvePreviewUrl()   [NEW SD-1]
        │   polls Vercel API every 10s (max 5min)
        │
        ▼ state = planning
        │
        ├── parser.parsePRBody(pr.body)
        │   → Plan {steps[]} | null (smoke fallback)
        │   → INSERT plan, test_case rows
        │
        ▼ state = running
        │
        └── Service Bus: publish "run.execute" {runId, previewUrl, testCases[]}
                  │
                  ▼
        Browser Runner (apps/browser-runner)     [NEW SD-2]
                  │
                  ├── Playwright.launch()
                  ├── page.goto(previewUrl)
                  ├── execute steps[] via step-runner
                  │   each step: action → pass/fail, duration, screenshotOnFail
                  ├── upload artifacts to Azure Blob Storage
                  └── Service Bus: publish "run.result" {runId, stepResults, artifactUrls}
                            │
                            ▼
        Orchestrator (back)                      [NEW SD-3 cont.]
                  │
                  ▼ state = analyzing
                  │
                  ├── ai.classifyFailure() per failed step  [NEW SD-4]
                  │   → {category, reason, suggested_fix}
                  │   → UPDATE result rows
                  │
                  ▼ state = reporting
                  │
                  ├── reporter.formatRunComment()            [NEW SD-6]
                  ├── github-adapter.createOrUpdateStickyComment()
                  └── github-adapter.updateCheckRun(conclusion=success|failure)
                            │
                            ▼ state = completed | failed
```

## Package dependency graph (Phase 2 additions in bold)

```
apps/api
  └── packages/db
  └── packages/domain

apps/orchestrator
  ├── packages/db
  ├── packages/domain
  ├── packages/parser
  ├── packages/planner
  ├── packages/reporter            (updated SD-6)
  ├── packages/github-adapter      (updated SC-3, SD-5)
  ├── packages/vercel-adapter      (updated SD-1)
  ├── packages/ai                  (updated SC-4, SD-4)
  └── packages/code-reviewer       (NEW SC-2)

apps/browser-runner
  ├── packages/db
  ├── packages/domain
  ├── packages/runner-playwright
  └── packages/observability

apps/web
  ├── packages/domain
  └── (HTTP calls to apps/api)
```

## GitHub comment anatomy

### AI Review comment (sticky, updates on each push)

```markdown
<!-- previewqa:review -->
## PreviewQA Code Review · PR #30

> Risk: **medium** · 3 errors · 1 warning · 2 info

### Summary
This PR refreshes the landing page hero section. Changes are purely cosmetic...

### Issues
| Sev | File | Line | Issue |
|-----|------|------|-------|
| 🔴 error | src/pages/Landing.tsx | 68 | H1 missing aria-label for screen readers |
| 🟡 warn  | src/pages/Landing.tsx | 88 | Hardcoded GitHub App URL — should be env var |

### Security
- [x] No secrets hardcoded
- [x] No SQL injection vectors
- [x] No XSS surfaces
- [x] Dependencies unchanged

### Missing test coverage
- `src/pages/Landing.tsx` — no snapshot or render test

---
*Updated 2026-04-26 14:32 UTC · [View run](https://previewqa.dev/app/...)*
```

### PreviewQA results comment (sticky, updates as run progresses)

```markdown
<!-- previewqa:run -->
## PreviewQA · PR #30 · ✅ 7/7 passed

| Step | Result | Duration |
|------|--------|----------|
| navigate / | ✅ pass | 1.2s |
| assert_visible h1 | ✅ pass | 0.3s |
| assert_visible a[href*="github.com"] | ✅ pass | 0.2s |
| assert_visible a[href="/app/dashboard"] | ✅ pass | 0.2s |
| screenshot hero-section | ✅ pass | 0.8s |
| navigate /app/dashboard | ✅ pass | 1.4s |
| screenshot dashboard-page | ✅ pass | 0.9s |

**Preview URL**: https://a-try-web-git-feat-landing-page-refresh.vercel.app

---
*[View full report](https://previewqa.dev/app/...) · Ran in 5.0s*
```

## Service Bus topic/subscription layout

```
Namespace: previewqa-sb

Topics:
  pr.review
    └── subscription: orchestrator

  run.execute
    └── subscription: browser-runner

  run.result
    └── subscription: orchestrator
```

## Sequence of GitHub statuses on a PR

```
PR opened
  → Check "PreviewQA" created: status=queued          (webhook fires, SD-5)
  → Check updated: status=in_progress                  (orchestrator picks up run)
  → AI review comment appears                          (S-C complete, ~30s)
  → Check updated: "Waiting for Vercel preview..."     (waiting_for_preview state)
  → Check updated: "Running 7 test cases"              (running state)
  → Check updated: status=completed, conclusion=success (all pass)
  → Results comment appears / updates                  (reporting state)
```
