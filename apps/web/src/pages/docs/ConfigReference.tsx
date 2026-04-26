export function ConfigReference() {
  return (
    <>
      <h1>Config reference</h1>
      <p>
        Create a <code>.previewqa/config.yaml</code> file in your repository root to configure
        per-repo behaviour. All fields are optional — PreviewQA works without any config file.
      </p>

      <hr />

      <h2>Full example</h2>
      <pre>{`version: 1

# Vercel configuration
vercel:
  projectName: my-vercel-project   # Override if different from repo name
  teamId: team_abc123              # Required for team/org Vercel accounts

# Default run mode when no QA block is present in a PR
# Options: smoke | hybrid
# Default: smoke
defaultMode: hybrid

# Per-step timeout in milliseconds
# Default: 30000 (30 seconds)
stepTimeoutMs: 30000

# Hard kill per run (all steps must complete within this)
# Default: 600000 (10 minutes)
runTimeoutMs: 600000

# Maximum test cases per run
# Default: 20
maxTestCases: 20

# Login profiles — named sets of credentials
# Credentials are stored in Azure Key Vault, not here
loginProfiles:
  - name: admin-user
    secretName: previewqa-login-admin   # Key Vault secret name
  - name: read-only-user
    secretName: previewqa-login-readonly`}</pre>

      <hr />

      <h2>Fields reference</h2>

      <h3><code>version</code></h3>
      <p>Schema version. Currently <code>1</code>. Required.</p>

      <h3><code>vercel.projectName</code></h3>
      <p>
        The Vercel project name used to resolve the preview URL.
        Defaults to the GitHub repository name. Set this if your Vercel project name differs from your repo name.
      </p>

      <h3><code>vercel.teamId</code></h3>
      <p>
        Required for Vercel Team accounts. Your team ID can be found in the Vercel dashboard under
        Settings → General → Team ID.
      </p>

      <h3><code>defaultMode</code></h3>
      <p>
        The run mode to use when no QA block is found in the PR description.
      </p>
      <ul>
        <li><code>smoke</code> — navigate to <code>/</code> and take a screenshot (default)</li>
        <li><code>hybrid</code> — smoke + heuristic route checks for changed files</li>
      </ul>

      <h3><code>stepTimeoutMs</code></h3>
      <p>
        Maximum time in milliseconds to wait for each step to complete.
        If a step exceeds this, the step fails with a timeout error.
        Default: <code>30000</code>.
      </p>

      <h3><code>runTimeoutMs</code></h3>
      <p>
        Hard kill timeout for the entire run. If the run exceeds this, it transitions to
        <code>blocked_environment</code> state and the GitHub Check is marked failed.
        Default: <code>600000</code> (10 minutes).
      </p>

      <h3><code>maxTestCases</code></h3>
      <p>
        Maximum number of test cases allowed per run. Excess cases are dropped with a warning.
        Default: <code>20</code>.
      </p>

      <h3><code>loginProfiles</code></h3>
      <p>
        Named login profiles. Each profile references an Azure Key Vault secret that contains
        a Playwright <code>storageState</code> JSON (authentication cookies/tokens).
      </p>
      <p>
        To create a login profile secret, run your login flow locally with Playwright,
        save <code>storageState</code> to a file, and upload it to Key Vault:
      </p>
      <pre>{`# Save login state locally
npx playwright codegen --save-storage=auth.json https://myapp.com

# Upload to Azure Key Vault
az keyvault secret set \\
  --vault-name your-keyvault \\
  --name previewqa-login-admin \\
  --file auth.json`}</pre>

      <hr />

      <h2>Validation</h2>
      <p>
        Config is validated on every PR event. If the config file is invalid, a parse error comment
        is posted and the run falls back to smoke mode.
      </p>
    </>
  );
}
