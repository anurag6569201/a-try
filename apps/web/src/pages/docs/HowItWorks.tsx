export function HowItWorks() {
  return (
    <>
      <h1>How it works</h1>
      <p>
        PreviewQA is a GitHub App that listens for PR events, resolves Vercel preview URLs,
        runs Playwright tests, and reports results back to GitHub.
      </p>

      <hr />

      <h2>Architecture overview</h2>
      <pre>{`GitHub webhook
  ↓  (HMAC-verified)
Webhook API (Azure Functions)
  ↓  (Service Bus message)
Orchestrator (Azure Container App)
  ↓  (resolves preview URL)
Browser Runner (Azure Container App Job)
  ↓  (Playwright tests)
Reporter → GitHub Check + PR comment`}</pre>

      <h2>Event flow</h2>
      <ol>
        <li>
          <strong>PR opened / pushed</strong> — GitHub sends a webhook. The webhook API validates the signature,
          normalizes the payload, and enqueues it to Azure Service Bus.
        </li>
        <li>
          <strong>Orchestrator picks up the event</strong> — Creates a run record in the database.
          Creates a "queued" GitHub Check on the PR.
        </li>
        <li>
          <strong>Preview URL resolution</strong> — Polls the Vercel API (and GitHub deployment status events)
          every 30 seconds for up to 15 minutes. If not found, the run transitions to <code>blocked_environment</code>.
        </li>
        <li>
          <strong>Planning</strong> — Parses the PR description for a QA block. If found, validates it
          and creates test cases. If not found, creates a default smoke test.
        </li>
        <li>
          <strong>Running</strong> — Triggers an Azure Container App Job with the plan as JSON.
          Playwright runs the steps against the preview URL and uploads screenshots/traces to Azure Blob Storage.
        </li>
        <li>
          <strong>Analyzing</strong> — AI classifies each failure and generates summaries.
          Similar past runs are retrieved from pgvector for context.
        </li>
        <li>
          <strong>Reporting</strong> — Formats and posts the sticky PR comment. Updates the GitHub Check.
          Stores artifact URLs in the database.
        </li>
      </ol>

      <h2>State machine</h2>
      <p>Each run moves through these states:</p>
      <pre>{`queued → waiting_for_preview → planning → running → analyzing → reporting → completed
                                                                             ↘ failed
                              ↘ blocked_environment (preview timeout)
                                                  ↘ canceled (superseded by new push)`}</pre>

      <h2>Superseded SHA detection</h2>
      <p>
        When a new commit is pushed to a PR while a run is in progress, the old run is canceled automatically.
        Only the latest SHA is ever running for a given PR.
      </p>

      <h2>Data retention</h2>
      <ul>
        <li>Run metadata: 90 days</li>
        <li>Screenshots: 30 days</li>
        <li>Traces: 14 days</li>
        <li>Videos: 14 days</li>
        <li>Audit events: 90 days</li>
      </ul>
    </>
  );
}
