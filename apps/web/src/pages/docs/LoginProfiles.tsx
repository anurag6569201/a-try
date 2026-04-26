export function LoginProfiles() {
  return (
    <>
      <h1>Login profiles</h1>
      <p>
        Login profiles let your Playwright tests run as an authenticated user without putting credentials in your PR description.
        Credentials are stored in Azure Key Vault and are never visible in logs, comments, or artifacts.
      </p>

      <hr />

      <h2>How it works</h2>
      <ol>
        <li>You record a Playwright <code>storageState</code> (auth cookies/tokens) locally.</li>
        <li>You upload it to Azure Key Vault as a secret.</li>
        <li>You reference the profile name in <code>.previewqa/config.yaml</code> and in your PR's test block.</li>
        <li>PreviewQA fetches the secret at run start and injects it as Playwright's <code>storageState</code>.</li>
      </ol>

      <hr />

      <h2>Step 1 — Record your login state</h2>
      <pre>{`# Open Playwright codegen against your staging/prod environment
npx playwright codegen \\
  --save-storage=auth-admin.json \\
  https://your-staging.vercel.app

# Log in via the browser that opens, then close it.
# auth-admin.json now contains your session cookies.`}</pre>

      <h2>Step 2 — Upload to Azure Key Vault</h2>
      <pre>{`az keyvault secret set \\
  --vault-name YOUR_VAULT_NAME \\
  --name previewqa-login-admin \\
  --file auth-admin.json`}</pre>
      <p>
        The PreviewQA GitHub App's managed identity must have <code>Get</code> permission on Key Vault secrets.
        This is configured once by your platform team during initial setup.
      </p>

      <h2>Step 3 — Register in config.yaml</h2>
      <pre>{`# .previewqa/config.yaml
version: 1

loginProfiles:
  - name: admin-user
    secretName: previewqa-login-admin
  - name: viewer-user
    secretName: previewqa-login-viewer`}</pre>

      <h2>Step 4 — Use in a test block</h2>
      <pre>{`<!-- previewqa:start -->
version: 1
login: admin-user

steps:
  - navigate: /admin/dashboard
  - assert_visible:
      selector: '[data-testid="admin-panel"]'
  - screenshot: admin-dashboard
<!-- previewqa:end -->`}</pre>

      <hr />

      <h2>Security notes</h2>
      <ul>
        <li>Login profiles are <strong>never</strong> accessible from fork PRs. Fork PRs are always smoke-only.</li>
        <li>The <code>storageState</code> is fetched at run start and injected directly into the Playwright browser context. It is never written to disk in the runner container.</li>
        <li>Artifacts (screenshots, traces) are scanned for secrets before upload.</li>
        <li>Credentials in <code>storageState</code> typically expire. Refresh them periodically by re-running the codegen step.</li>
      </ul>

      <h2>Rotating credentials</h2>
      <p>When your session expires or you need to rotate credentials:</p>
      <ol>
        <li>Re-run <code>playwright codegen --save-storage=auth.json</code></li>
        <li>Update the Key Vault secret: <code>az keyvault secret set --vault-name YOUR_VAULT --name SECRET_NAME --file auth.json</code></li>
        <li>The next run will automatically pick up the new credentials.</li>
      </ol>
    </>
  );
}
