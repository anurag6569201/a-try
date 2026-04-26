export function AiFeatures() {
  return (
    <>
      <h1>AI features</h1>
      <p>
        PreviewQA uses Azure OpenAI to add intelligence at three points in the pipeline:
        failure classification, failure summarization, and plan suggestions.
      </p>

      <hr />

      <h2>Failure classification</h2>
      <p>
        When a test step fails, PreviewQA classifies the failure into one of five categories:
      </p>
      <table>
        <thead>
          <tr><th>Category</th><th>Meaning</th></tr>
        </thead>
        <tbody>
          <tr><td><code>product_bug</code></td><td>The app changed in a way that broke the test — likely a real regression</td></tr>
          <tr><td><code>test_bug</code></td><td>The test step is wrong (selector changed, step is outdated)</td></tr>
          <tr><td><code>environment_issue</code></td><td>The Vercel preview was slow, cold-started, or had a 5xx</td></tr>
          <tr><td><code>flaky</code></td><td>Intermittent failure — the same step passed on a previous run</td></tr>
          <tr><td><code>needs_clarification</code></td><td>Ambiguous — requires human review</td></tr>
        </tbody>
      </table>
      <p>The classification appears in the PR comment alongside the failure summary.</p>

      <h2>Failure summarization</h2>
      <p>
        For every failed step, PreviewQA generates a human-readable explanation and (when possible)
        a suggested fix. These appear in the PR comment as a collapsible "AI Analysis" section.
      </p>
      <p>Example output:</p>
      <pre>{`⚠ AI Analysis (product_bug)

The selector [data-testid="pay-now"] was not found on the page.
Based on the PR diff, the button was renamed from "pay-now" to "checkout-submit"
in this change. The test step needs to be updated to match.

Suggested fix: Update the selector to [data-testid="checkout-submit"]`}</pre>

      <h2>Plan suggestions</h2>
      <p>
        On Growth and Team plans, PreviewQA analyzes the PR's changed files and suggests
        additional test steps that might be missing from your QA block.
      </p>
      <p>Suggestions are posted as an informational comment (never blocking):</p>
      <pre>{`💡 PreviewQA suggestions (non-blocking)

Based on the files changed in this PR, you might want to add:
  • A test for /settings/billing — settings.ts was modified
  • An assertion on [data-testid="billing-card"] — billing component was updated

Add these to your <!-- previewqa:start --> block to verify the changes.`}</pre>

      <h2>AI privacy</h2>
      <ul>
        <li>AI prompts include step details, failure messages, and file paths — not full source code.</li>
        <li>PR description content is sent to Azure OpenAI for plan analysis only when AI features are enabled.</li>
        <li>Secrets are redacted before any AI call.</li>
        <li>All AI calls are logged to the <code>model_trace</code> table (visible in your dashboard) with token counts and latency.</li>
      </ul>

      <h2>Disabling AI features</h2>
      <p>
        AI features are enabled by default on Starter and above plans.
        They cannot currently be disabled per-repo, but repo-level opt-out is on the roadmap.
      </p>
    </>
  );
}
