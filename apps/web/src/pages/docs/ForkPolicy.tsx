export function ForkPolicy() {
  return (
    <>
      <h1>Fork policy</h1>
      <p>
        PreviewQA enforces a strict security policy for pull requests from forked repositories.
        This prevents untrusted code from accessing credentials or running privileged test modes.
      </p>

      <hr />

      <h2>What changes for fork PRs</h2>
      <table>
        <thead>
          <tr><th>Feature</th><th>Own repo PR</th><th>Fork PR</th></tr>
        </thead>
        <tbody>
          <tr><td>Smoke tests</td><td>✓</td><td>✓</td></tr>
          <tr><td>Instruction mode (YAML steps)</td><td>✓</td><td>✗ (downgraded to smoke)</td></tr>
          <tr><td>Hybrid mode</td><td>✓</td><td>✗ (downgraded to smoke)</td></tr>
          <tr><td>Login profiles</td><td>✓</td><td>✗ (never accessed)</td></tr>
          <tr><td>AI plan suggestions</td><td>✓</td><td>✗</td></tr>
          <tr><td>Screenshots</td><td>✓</td><td>✓</td></tr>
          <tr><td>/qa rerun</td><td>✓</td><td>✓ (smoke only)</td></tr>
        </tbody>
      </table>

      <h2>How fork detection works</h2>
      <p>
        Fork status is determined from the immutable <code>pull_request.head.repo.fork</code> field
        in the GitHub webhook payload. This is set by GitHub — it cannot be spoofed by the PR author.
      </p>
      <p>
        Every fork policy decision is written to the audit log with event type <code>fork_policy.downgrade</code>.
        You can review these in your installation's audit history.
      </p>

      <h2>Why this policy exists</h2>
      <p>
        When a fork PR triggers a run, the PR author can potentially influence what code runs
        in the Playwright browser. Giving fork PRs access to:
      </p>
      <ul>
        <li><strong>Login profiles</strong> — could expose session tokens via screenshots or console logs</li>
        <li><strong>Instruction mode</strong> — could navigate to arbitrary URLs or exfiltrate data</li>
      </ul>
      <p>
        Smoke mode is safe for forks because it only navigates to the preview URL root and takes a screenshot —
        no credentials are involved.
      </p>

      <h2>Overriding for trusted forks</h2>
      <p>
        There is currently no way to whitelist specific fork authors for instruction mode.
        If you need full test coverage on fork PRs, ask the contributor to push their branch
        directly to your repository.
      </p>
    </>
  );
}
