export function GithubAppSetup() {
  return (
    <>
      <h1>GitHub App setup</h1>
      <p>
        PreviewQA is distributed as a GitHub App. Installation takes about 2 minutes.
      </p>

      <hr />

      <h2>Installing the app</h2>
      <ol>
        <li>
          Go to the{' '}
          <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
            PreviewQA GitHub App
          </a>.
        </li>
        <li>Click <strong>Install</strong>.</li>
        <li>Choose your GitHub account or organization.</li>
        <li>
          Select <strong>All repositories</strong> or choose specific repositories.
          You can change this at any time.
        </li>
        <li>Authorize the permissions (see below).</li>
      </ol>

      <h2>Required permissions</h2>
      <table>
        <thead>
          <tr><th>Permission</th><th>Access</th><th>Why</th></tr>
        </thead>
        <tbody>
          <tr><td>Pull requests</td><td>Read & Write</td><td>Post PR comments, read PR body</td></tr>
          <tr><td>Issues</td><td>Write</td><td>Post issue comments (for /qa commands)</td></tr>
          <tr><td>Checks</td><td>Read & Write</td><td>Create and update GitHub Checks</td></tr>
          <tr><td>Contents</td><td>Read</td><td>Read .previewqa/config.yaml and PR templates</td></tr>
          <tr><td>Metadata</td><td>Read</td><td>Required by all GitHub Apps</td></tr>
          <tr><td>Commit statuses</td><td>Read & Write</td><td>Update deployment statuses</td></tr>
          <tr><td>Deployments</td><td>Read</td><td>Detect Vercel preview URLs via deployment events</td></tr>
        </tbody>
      </table>

      <h2>Removing the app</h2>
      <p>
        Go to <strong>GitHub Settings → Applications → Installed GitHub Apps</strong>,
        find PreviewQA, and click <strong>Configure → Uninstall</strong>.
      </p>
      <p>
        Uninstalling stops all future runs. Existing run history and artifacts are retained
        for 90 days before automatic deletion.
      </p>

      <h2>Changing repository access</h2>
      <p>
        Go to <strong>GitHub Settings → Applications → Installed GitHub Apps → PreviewQA → Configure</strong>.
        Add or remove repository access without uninstalling.
      </p>
    </>
  );
}
