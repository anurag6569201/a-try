export function Changelog() {
  return (
    <>
      <h1>Changelog</h1>
      <p>All notable changes to PreviewQA.</p>

      <hr />

      <h2>v0.9.0 — Dashboard & security hardening</h2>
      <p><em>Sprint 5.4–5.5</em></p>
      <ul>
        <li>New React dashboard: installation management, run history, artifact browser, model trace viewer</li>
        <li>Repo config editor in dashboard</li>
        <li>Usage bars with tier limit visualization</li>
        <li>Installation suspension support</li>
        <li>CVE patching: resolved high-severity <code>glob</code> vulnerability</li>
        <li>5 operational runbooks added to documentation</li>
      </ul>

      <h2>v0.8.0 — Onboarding flow</h2>
      <p><em>Sprint 5.3</em></p>
      <ul>
        <li>GitHub App installation triggers onboarding checklist comment on most recent open PR</li>
        <li>Checklist detects PR template, data-testid selectors, <code>.previewqa/config.yaml</code>, login profiles</li>
        <li><code>installation.created</code> event routed through orchestrator</li>
      </ul>

      <h2>v0.7.0 — Stripe billing</h2>
      <p><em>Sprint 5.2</em></p>
      <ul>
        <li>Stripe webhook handler: subscription created, updated, deleted, payment failure</li>
        <li>7-day grace period on payment failure before quota enforcement</li>
        <li>Idempotent billing event processing</li>
        <li>Billing DB schema: <code>stripe_customer_id</code>, <code>grace_period_ends_at</code></li>
      </ul>

      <h2>v0.6.0 — Multi-tenancy</h2>
      <p><em>Sprint 5.1</em></p>
      <ul>
        <li>Billing tier enforcement: Free / Starter / Growth / Team</li>
        <li>Monthly run quota with CTA comment on exceeded</li>
        <li>Upgrade CTA posted to PR when quota reached</li>
        <li>Per-installation data isolation</li>
      </ul>

      <h2>v0.5.0 — Prompt regression suite</h2>
      <p><em>Sprint 4.4</em></p>
      <ul>
        <li>40+ golden fixture tests across all 4 AI prompts</li>
        <li>CI fails if any fixture regresses</li>
      </ul>

      <h2>v0.4.0 — pgvector retrieval</h2>
      <p><em>Sprint 4.3</em></p>
      <ul>
        <li>Run summaries embedded with Azure OpenAI text-embedding-3-small</li>
        <li>3 most similar past runs retrieved as context for failure summarizer</li>
        <li>HNSW index on embeddings table for &lt;2s retrieval</li>
      </ul>

      <h2>v0.3.0 — Hardening</h2>
      <p><em>Sprints 3.1–3.4</em></p>
      <ul>
        <li>Fork policy: fork PRs downgraded to smoke-only, audit event written</li>
        <li>Per-step and per-run timeouts</li>
        <li>Retry policy: 3 attempts with exponential backoff</li>
        <li>Concurrency cap and rerun rate limit</li>
        <li>Blob storage lifecycle rules</li>
      </ul>
    </>
  );
}
