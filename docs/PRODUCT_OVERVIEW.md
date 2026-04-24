# Product Overview

## Working name

**Preview QA Agent**

## One-line pitch

A GitHub-native QA agent that reads structured test instructions from a PR, waits for the Vercel preview deployment, runs browser validation against that preview, and posts an auditable pass/fail report with artifacts back to the PR.

---

## Problem

Frontend and full-stack teams often merge PRs with broken user flows because:

- reviewers do not manually test preview URLs consistently
- QA instructions are buried in PR text, Slack, or tickets
- automated tests do not cover the changed path
- preview deployments exist but are underused
- browser agents become flaky when run with no structured intent
- developers need fast feedback directly inside the PR, not in a separate tool

---

## Target users

### Primary users
- frontend developers using GitHub + Vercel
- startup engineering teams without dedicated QA
- product teams shipping UI changes frequently
- engineering leads who want stronger merge confidence

### Secondary users
- QA engineers who want repeatable preview verification
- managers who want visibility into pre-merge quality signals
- platform teams building internal developer tooling

---

## Jobs to be done

### For developers
- “When I open or update a PR, I want the preview URL automatically tested against the flows I described.”

### For reviewers
- “Before approving a PR, I want a trustworthy summary of what was tested, what failed, and links to evidence.”

### For teams
- “We want fewer UI regressions reaching main without forcing manual QA on every branch.”

---

## Core value proposition

Preview QA Agent combines:

1. **PR-native workflow**
   - works where developers already collaborate

2. **Preview deployment execution**
   - validates the actual deployed branch UI, not just local assumptions

3. **Structured intent**
   - uses defined QA instructions from the PR description

4. **Deterministic browser testing**
   - uses Playwright for reliable execution and artifacts

5. **AI-assisted reasoning**
   - plans tests, summarizes failures, and explains risk clearly

---

## Product scope

### Core capabilities
- detect PR events from GitHub
- resolve Vercel preview URL for the PR commit
- parse structured QA instructions from PR body
- create executable test plan
- run browser tests against preview deployment
- capture artifacts: screenshots, traces, logs, optionally video
- classify outcome
- post GitHub Check + PR comment summary
- allow reruns through PR comments
- record metadata for analysis and debugging

### Future capabilities
- auto-suggest missing test cases based on diff
- impacted route/component analysis
- repo-aware test selection
- visual regression layer
- multi-tenant dashboard
- historical quality analytics
- knowledge graph over routes/components/tests/PRs

---

## What this product is not

- not a replacement for unit/integration tests
- not a replacement for static analysis
- not a fully autonomous browser agent with no constraints
- not a generic repo chatbot
- not a full CI system
- not a mobile native testing platform in v1

---

## MVP definition

The MVP is successful when it can:

1. respond to PR open/update events
2. detect or wait for the related Vercel preview URL
3. parse a structured QA block in the PR description
4. run deterministic Playwright checks against the preview
5. post a pass/fail/blocked result back to the PR
6. attach or link to test artifacts
7. support rerun from PR comments
8. safely handle failures, timeouts, and missing instructions

---

## Success metrics

| Metric | Target |
|---|---|
| p90 time from preview-ready to first QA result | < 10 minutes |
| platform-induced false failure rate | < 5% |
| successful preview resolution rate | > 95% |
| PRs with parseable QA instructions on onboarded repos | > 90% |
| rerun success rate | > 95% |
| internal user usefulness score | > 4/5 |
| pre-merge UI defects caught | trend upward month over month |

---

## Product principles

### 1. Deterministic first
Use AI for planning and explanation, not for replacing truth.

### 2. PR-native
All important feedback should appear inside GitHub.

### 3. Human-auditable
Every failure must include evidence and traceable reasoning.

### 4. Configuration over prompts
Stable behavior should come from contracts and config, not prompt magic.

### 5. Safe on untrusted code
Preview deployments are untrusted execution targets.

### 6. Useful before clever
Reliable smoke validation is more valuable than a fancy but flaky agent.

---

## Assumptions and prerequisites

For best results, onboarded repos should provide:

- Vercel preview deployments for PR branches
- stable `data-testid` selectors on important UI
- sandbox or seeded preview data
- non-production test accounts
- preview access compatible with automation
- auth flows that can use test credentials or saved auth state
- predictable routes for critical user flows

---

## Companion stack outside this product

This product should sit beside a normal engineering quality baseline:

- GitHub Actions
- CodeQL
- Semgrep
- Reviewdog
- unit tests
- integration tests
- existing Playwright suites where available

Preview QA Agent is the **behavior verification layer** on top of that baseline.

---

## Why this can become a real product

This is useful for teams because it solves a frequent gap:

- code review is strong
- CI exists
- preview deployments exist
- but **actual preview verification is weak and inconsistent**

That makes this product commercially meaningful for:
- Vercel-heavy teams
- frontend-first startups
- teams without dedicated QA headcount
- platform teams wanting merge confidence without slowing development