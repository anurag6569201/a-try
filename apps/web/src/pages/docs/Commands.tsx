export function Commands() {
  return (
    <>
      <h1>PR commands</h1>
      <p>
        PreviewQA responds to slash commands posted as PR comments. Only repository collaborators can trigger commands.
      </p>

      <hr />

      <h2>Available commands</h2>

      <h3><code>/qa rerun</code></h3>
      <p>
        Cancels the current active run for this PR and starts a new run against the latest commit SHA.
        Uses the same run mode as the last run (smoke, instruction, or hybrid).
      </p>
      <pre>{`/qa rerun`}</pre>
      <p>
        <strong>Rate limit:</strong> Maximum 5 reruns per PR per hour. If the limit is reached,
        PreviewQA posts a message explaining when you can try again.
      </p>

      <h3><code>/qa smoke</code></h3>
      <p>
        Forces a smoke-only run, ignoring any QA block in the PR description.
        Useful when you want a quick sanity check without running the full instruction set.
      </p>
      <pre>{`/qa smoke`}</pre>

      <h3><code>/qa help</code></h3>
      <p>Posts a command reference comment directly on the PR.</p>
      <pre>{`/qa help`}</pre>

      <hr />

      <h2>Authorization</h2>
      <p>
        Commands are restricted to repository collaborators (anyone with push access).
        External contributors and fork authors cannot trigger commands.
        If an unauthorized user tries a command, PreviewQA replies:
      </p>
      <pre>{`@username Only repository collaborators can trigger QA commands.`}</pre>

      <h2>Command response timing</h2>
      <p>
        PreviewQA acknowledges commands by posting a comment within a few seconds.
        The new run appears in your dashboard and as a GitHub Check as soon as it starts processing.
      </p>

      <h2>Fork PRs</h2>
      <p>
        Fork PRs can receive <code>/qa rerun</code> but are always downgraded to smoke-only mode —
        they cannot run instruction or hybrid mode or access login profiles.
        See <a href="/docs/fork-policy">Fork policy</a> for details.
      </p>
    </>
  );
}
