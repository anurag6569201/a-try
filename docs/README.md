# Documentation Index

This repo contains the product definition, architecture, contracts, and implementation plan for **Preview QA Agent**.

## What this product is

A GitHub-native QA agent that:

- watches pull requests
- detects the Vercel preview deployment for the PR branch
- reads structured testing instructions from the PR description
- executes browser validation against that preview
- posts a clear result with artifacts back to the PR

## Why this docs set exists

These docs are intended to give:

- clear product boundaries
- implementation guidance
- a safe and scalable architecture
- enough structure for human contributors and coding agents
- a roadmap from MVP to production

## Reading order

1. `PRODUCT_OVERVIEW.md`
2. `ARCHITECTURE.md`
3. `WORKFLOWS.md`
4. `PR_INSTRUCTIONS_SPEC.md`
5. `IMPLEMENTATION_PLAN.md`
6. `REPOSITORY_STRUCTURE.md`
7. `OPERATIONS_AND_SECURITY.md`

## Current v1 target

The first launchable version should support:

- GitHub App installation
- PR intake
- Vercel preview resolution
- structured PR instructions
- Playwright execution
- GitHub Check updates
- sticky PR result comments
- screenshots / traces / logs
- reruns through PR comments

## Strategic architecture stance

### Build now
- GitHub App
- Azure Functions
- Azure Container Apps / Jobs
- Azure Service Bus
- Azure AI Foundry / Azure OpenAI
- PostgreSQL
- Blob Storage
- Playwright
- App Insights
- Key Vault
- Terraform

### Add later
- LangGraph
- tree-sitter
- SCIP / LSIF
- pgvector
- Neo4j
- OpenSearch
- Temporal
- AKS / ArgoCD

## Important product principle

This product should **complement**, not replace:

- CodeQL
- Semgrep
- Reviewdog
- existing CI tests
- unit/integration/E2E suites

Those tools catch code and policy issues.
This product validates **real PR preview behavior** against **declared test intent**.

## Commercialization path

- Phase 1: internal dogfooding
- Phase 2: private beta for a few repos/teams
- Phase 3: multi-repo, multi-installation GitHub App
- Phase 4: launchable SaaS for teams using GitHub + Vercel

## Naming

Working product name in docs: **Preview QA Agent**

Rename later if branding changes.