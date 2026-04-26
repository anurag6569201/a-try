export function Modes() {
  return (
    <>
      <h1>Run modes</h1>
      <p>Every PreviewQA run has a mode that determines which tests are executed.</p>

      <hr />

      <h2>Smoke</h2>
      <p>
        The default mode. PreviewQA navigates to <code>/</code> on the preview URL, asserts a 200 response,
        and takes a screenshot. No YAML block needed.
      </p>
      <p><strong>When it runs:</strong> No QA block found in the PR description, or <code>/qa smoke</code> command used.</p>

      <h2>Instruction</h2>
      <p>
        Runs the exact steps defined in the PR's <code>{'<!-- previewqa:start -->'}</code> block.
        Nothing extra is added.
      </p>
      <p><strong>When it runs:</strong> A valid QA block is found in the PR description.</p>

      <h2>Hybrid</h2>
      <p>
        Runs your QA block steps, then appends heuristic smoke checks for routes affected by
        the PR's changed files.
      </p>
      <p>
        For example, if the PR modifies <code>app/dashboard/page.tsx</code>, PreviewQA adds
        a smoke check for <code>/dashboard</code>.
      </p>
      <p>
        <strong>When it runs:</strong> Set <code>defaultMode: hybrid</code> in your config file,
        or <code>/qa rerun</code> when a previous hybrid run exists.
      </p>

      <h2>Choosing a mode</h2>
      <table>
        <thead>
          <tr><th>Scenario</th><th>Recommended mode</th></tr>
        </thead>
        <tbody>
          <tr><td>New repo, no QA blocks yet</td><td>smoke (default)</td></tr>
          <tr><td>Critical user flows to verify</td><td>instruction</td></tr>
          <tr><td>Full regression coverage</td><td>hybrid</td></tr>
          <tr><td>Fork PR (always enforced)</td><td>smoke</td></tr>
        </tbody>
      </table>
    </>
  );
}
