import { RunMode, BillingTier, TIER_LIMITS } from '@preview-qa/domain';
import { createRun, cancelSupersededRuns, getPullRequestByRepoAndNumber, getLatestRunForPR, countRerunsForPRSince, getInstallationById, countRunsForInstallationSince } from '@preview-qa/db';
import type { Pool } from 'pg';
import type { IssueCommentEventEnvelope } from '@preview-qa/schemas';
import { getInstallationOctokit, isCollaborator, postComment, getPRMetadata } from '@preview-qa/github-adapter';
import { createLogger } from '@preview-qa/observability';
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

  const log = createLogger('orchestrator', {
    installationId: String(installationId),
    repositoryId: String(repositoryId),
  });

  const [owner, repo] = repositoryFullName.split('/');
  if (!owner || !repo) {
    log.warn({ repositoryFullName }, 'malformed repositoryFullName in issue_comment event');
    return;
  }

  const command = parseCommand(body);
  if (!command) return;

  const octokit = await getInstallationOctokit(config.github, Number(installationId));

  // Authorization: only collaborators can trigger commands
  const authorized = await isCollaborator(octokit, owner, repo, authorLogin);
  if (!authorized) {
    log.warn({ authorLogin, repositoryFullName, githubNumber }, 'unauthorized /qa command');
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
    log.warn({ repositoryId, githubNumber }, 'PR not found in DB for /qa command');
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
    log.error({ err, githubNumber }, 'failed to get PR metadata');
    return;
  }

  // Billing quota: check monthly run limit before creating a run
  const installation = await getInstallationById(pool, installationId);

  if (installation?.suspended_at != null) {
    log.warn({ installationId }, 'dropping /qa command — installation is suspended');
    return;
  }

  const tier = installation?.tier ?? BillingTier.Free;
  const tierLimits = TIER_LIMITS[tier] ?? TIER_LIMITS[BillingTier.Free];
  const inGracePeriod = installation?.grace_period_ends_at != null && installation.grace_period_ends_at > new Date();
  const billingPeriodStart = new Date();
  billingPeriodStart.setDate(1);
  billingPeriodStart.setHours(0, 0, 0, 0);
  const monthlyRunCount = await countRunsForInstallationSince(pool, installationId, billingPeriodStart);
  if (!inGracePeriod && monthlyRunCount >= tierLimits.runsPerMonth) {
    log.warn({ monthlyRunCount, limit: tierLimits.runsPerMonth, tier, installationId }, 'monthly run quota exceeded on /qa command');
    await postComment(
      octokit,
      owner,
      repo,
      githubNumber,
      `@${authorLogin} Your **${tier}** plan has reached its monthly run limit (${tierLimits.runsPerMonth} runs). [Upgrade your plan](https://preview-qa.dev/pricing) to continue.`,
    );
    return;
  }

  // Rerun rate limit: max N reruns per PR per hour (default 5)
  const rateLimitPerHour = config.rerunRateLimitPerHour ?? 5;
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const rerunCount = await countRerunsForPRSince(pool, pr.id, since);
  if (rerunCount >= rateLimitPerHour) {
    log.warn({ rerunCount, rateLimitPerHour, githubNumber }, 'rerun rate limit reached');
    await postComment(
      octokit,
      owner,
      repo,
      githubNumber,
      `@${authorLogin} Rerun rate limit reached (${rateLimitPerHour} reruns per hour). Please wait before triggering another run.`,
    );
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

  const run = await createRun(pool, {
    pull_request_id: pr.id,
    repository_id: repositoryId,
    installation_id: installationId,
    sha: headSha,
    mode,
    triggered_by: triggeredBy,
  });

  log.info({ runId: run.id, command, githubNumber, mode, sha: headSha }, '/qa command: new run created');
}

function parseCommand(body: string): QaCommand | null {
  const trimmed = body.trim();
  const match = trimmed.match(/^\/qa\s+(\S+)/);
  if (!match) return null;
  const cmd = match[1]?.toLowerCase();
  if (cmd === 'rerun' || cmd === 'smoke' || cmd === 'help') return cmd;
  return null;
}
