export function Quickstart() {
  return (
    <>
      <h1>Quickstart</h1>
      <p>Get Playwright tests running on every Vercel preview deployment in under 5 minutes.</p>

      <hr />

      <h2>Prerequisites</h2>
      <ul>
        <li>A GitHub repository with pull requests</li>
        <li>Vercel deploys previews for each PR (this is the default Vercel behavior)</li>
        <li>Node 20+ if you plan to use the <code>.previewqa/config.yaml</code> wizard locally</li>
      </ul>

      <h2>Step 1 — Install the GitHub App</h2>
      <p>
        Go to the{' '}
        <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
          PreviewQA GitHub App
        </a>{' '}
        and click <strong>Install</strong>. Choose the repositories you want to monitor.
      </p>
      <p>
        After installation, PreviewQA posts an onboarding checklist comment to your most recent open PR.
        It checks for:
      </p>
      <ul>
        <li>A PR template (<code>.github/pull_request_template.md</code>)</li>
        <li><code>data-testid</code> attributes in your PR template</li>
        <li>A <code>.previewqa/config.yaml</code> config file</li>
        <li>Login profile definitions</li>
      </ul>

      <h2>Step 2 — Open a pull request</h2>
      <p>
        PreviewQA will automatically detect the Vercel preview URL for the PR and wait for the deployment to go live.
        Once live, it runs a <strong>smoke test</strong> (navigate + screenshot) with no additional configuration.
      </p>
      <p>
        A GitHub Check appears on your PR as soon as the run starts, and a sticky comment is posted with the results.
      </p>

      <h2>Step 3 — (Optional) Add a QA block to your PR</h2>
      <p>
        For structured testing, add a YAML block between special HTML comment markers in your PR description:
      </p>
      <pre>{`<!-- previewqa:start -->
version: 1

steps:
  - navigate: /
  - assert_visible:
      selector: '[data-testid="hero-heading"]'
  - screenshot: homepage
<!-- previewqa:end -->`}</pre>
      <p>
        PreviewQA detects and validates this block. If it's valid, those steps run instead of the default smoke test.
        If the YAML is invalid, a parse error comment is posted with specific guidance.
      </p>

      <h2>Step 4 — (Optional) Create a config file</h2>
      <p>
        For advanced configuration, create <code>.previewqa/config.yaml</code> in your repo root:
      </p>
      <pre>{`version: 1

# Override Vercel project name for preview URL resolution
vercel:
  projectName: my-vercel-project

# Default run mode when no QA block is present
defaultMode: smoke

# Per-step timeout in milliseconds
stepTimeoutMs: 30000

# Max test cases per run
maxTestCases: 20`}</pre>

      <h2>That's it</h2>
      <p>
        Every PR you open will now automatically get a Playwright test run against its Vercel preview.
        Use <code>/qa rerun</code> in a PR comment to trigger a new run at any time.
      </p>

      <hr />

      <h2>Next steps</h2>
      <ul>
        <li><a href="/docs/test-blocks">Test blocks (YAML)</a> — full reference for writing test steps</li>
        <li><a href="/docs/login-profiles">Login profiles</a> — authenticate before running tests</li>
        <li><a href="/docs/commands">PR commands</a> — <code>/qa rerun</code>, <code>/qa smoke</code>, <code>/qa help</code></li>
        <li><a href="/docs/ai">AI features</a> — failure classification and plan suggestions</li>
      </ul>
    </>
  );
}
