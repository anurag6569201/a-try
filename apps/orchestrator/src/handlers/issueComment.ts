import { RunMode } from '@preview-qa/domain';
import { createRun, cancelSupersededRuns, getPullRequestByRepoAndNumber, getLatestRunForPR } from '@preview-qa/db';
import type { Pool } from 'pg';
import type { IssueCommentEventEnvelope } from '@preview-qa/schemas';
import { getInstallationOctokit, isCollaborator, postComment, getPRMetadata } from '@preview-qa/github-adapter';
import type { OrchestratorConfig } from '../types.js';

type QaCommand = 'rerun' | 'smoke' | 'help';

const HELP_BODY = `**Preview QA — Commands**

| Command | Description |
|---------|-------------|
| \`/qa rerun\` | Cancel current run and re-run with the existing QA block |
| \`/qa smoke\` | Run smoke-only (ignores any QA instruction block) |
| \`/qa help\` | Show this message |
`;

export async function handleIssueCommentEvent(
  pool: Pool,
  config: OrchestratorConfig,
  envelope: IssueCommentEventEnvelope,
): Promise<void> {
  const { installationId, repositoryId, payload } = envelope;
  const { githubNumber, body, authorLogin, repositoryFullName } = payload;

  const [owner, repo] = repositoryFullName.split('/');
  if (!owner || !repo) {
    console.warn(`[issue_comment] Malformed repositoryFullName: ${repositoryFullName}`);
    return;
  }

  const command = parseCommand(body);
  if (!command) return;

  const octokit = await getInstallationOctokit(config.github, Number(installationId));

  // Authorization: only collaborators can trigger commands
  const authorized = await isCollaborator(octokit, owner, repo, authorLogin);
  if (!authorized) {
    console.warn(`[issue_comment] Unauthorized /qa command from ${authorLogin} on ${repositoryFullName}#${githubNumber}`);
    await postComment(
      octokit,
      owner,
      repo,
      githubNumber,
      `@${authorLogin} Only repository collaborators can trigger QA commands.`,
    );
    return;
  }

  if (command === 'help') {
    await postComment(octokit, owner, repo, githubNumber, HELP_BODY);
    return;
  }

  // Look up the pull_request record from our DB
  const pr = await getPullRequestByRepoAndNumber(pool, repositoryId, githubNumber);
  if (!pr) {
    console.warn(`[issue_comment] PR not found in DB: repo=${repositoryId} #${githubNumber}`);
    await postComment(
      octokit,
      owner,
      repo,
      githubNumber,
      `@${authorLogin} Preview QA has not processed this PR yet. Push a commit to trigger a run first.`,
    );
    return;
  }

  // Get current head SHA from GitHub so we run against the latest commit
  let headSha: string;
  try {
    const metadata = await getPRMetadata(octokit, owner, repo, githubNumber);
    headSha = metadata.headSha;
  } catch (err) {
    console.error(`[issue_comment] Failed to get PR metadata:`, err);
    return;
  }

  // Cancel any active runs for this PR
  await cancelSupersededRuns(pool, pr.id, headSha);

  // For rerun: use mode from last run, fallback to smoke
  let mode = RunMode.Smoke;
  if (command === 'rerun') {
    const lastRun = await getLatestRunForPR(pool, pr.id);
    mode = lastRun?.mode ?? RunMode.Smoke;
  }
  const triggeredBy = command === 'smoke' ? 'smoke_command' : 'rerun_command';

  await createRun(pool, {
    pull_request_id: pr.id,
    repository_id: repositoryId,
    installation_id: installationId,
    sha: headSha,
    mode,
    triggered_by: triggeredBy,
  });

  console.log(`[issue_comment] Created new run: /qa ${command} PR #${githubNumber} mode=${mode} sha=${headSha}`);
}

function parseCommand(body: string): QaCommand | null {
  const trimmed = body.trim();
  const match = trimmed.match(/^\/qa\s+(\S+)/);
  if (!match) return null;
  const cmd = match[1]?.toLowerCase();
  if (cmd === 'rerun' || cmd === 'smoke' || cmd === 'help') return cmd;
  return null;
}
