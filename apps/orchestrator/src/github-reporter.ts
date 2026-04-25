import { RunState } from '@preview-qa/domain';
import { getInstallationOctokit, createCheckRun, updateCheckRun } from '@preview-qa/github-adapter';
import type { GitHubAppConfig, CheckRunStatus, CheckRunConclusion } from '@preview-qa/github-adapter';

const CHECK_NAME = 'Preview QA';

interface ReporterContext {
  config: GitHubAppConfig;
  installationId: number;
  owner: string;
  repo: string;
  sha: string;
}

function stateToCheckStatus(state: RunState): { status: CheckRunStatus; conclusion?: CheckRunConclusion } {
  switch (state) {
    case RunState.Queued:
      return { status: 'queued' };
    case RunState.WaitingForPreview:
    case RunState.Planning:
    case RunState.Running:
    case RunState.Analyzing:
    case RunState.Reporting:
      return { status: 'in_progress' };
    case RunState.Completed:
      return { status: 'completed', conclusion: 'success' };
    case RunState.Failed:
      return { status: 'completed', conclusion: 'failure' };
    case RunState.Canceled:
      return { status: 'completed', conclusion: 'cancelled' };
    case RunState.BlockedEnvironment:
      return { status: 'completed', conclusion: 'timed_out' };
    case RunState.NeedsHuman:
      return { status: 'completed', conclusion: 'action_required' };
  }
}

function stateToSummary(state: RunState): string {
  switch (state) {
    case RunState.Queued:
      return 'Run queued — waiting to start.';
    case RunState.WaitingForPreview:
      return 'Waiting for Vercel preview deployment to become ready.';
    case RunState.Planning:
      return 'Generating test plan from PR description.';
    case RunState.Running:
      return 'Playwright tests are running against the preview.';
    case RunState.Analyzing:
      return 'Analyzing test results.';
    case RunState.Reporting:
      return 'Writing results back to GitHub.';
    case RunState.Completed:
      return 'All checks passed.';
    case RunState.Failed:
      return 'One or more tests failed.';
    case RunState.Canceled:
      return 'Run was canceled (superseded by a newer commit).';
    case RunState.BlockedEnvironment:
      return 'Preview environment did not become ready within the timeout window.';
    case RunState.NeedsHuman:
      return 'Human review required before proceeding.';
  }
}

export async function createInitialCheck(
  ctx: ReporterContext,
  runId: string,
): Promise<number> {
  const octokit = await getInstallationOctokit(ctx.config, ctx.installationId);
  return createCheckRun(octokit, {
    owner: ctx.owner,
    repo: ctx.repo,
    name: CHECK_NAME,
    headSha: ctx.sha,
    status: 'queued',
    externalId: runId,
    output: {
      title: 'Preview QA',
      summary: 'Run queued — waiting to start.',
    },
  });
}

export async function reportStateChange(
  ctx: ReporterContext,
  checkRunId: number,
  state: RunState,
): Promise<void> {
  await reportStateChangeWithBody(ctx, checkRunId, state, undefined);
}

export async function reportStateChangeWithBody(
  ctx: ReporterContext,
  checkRunId: number,
  state: RunState,
  body: string | undefined,
): Promise<void> {
  const octokit = await getInstallationOctokit(ctx.config, ctx.installationId);
  const { status, conclusion } = stateToCheckStatus(state);
  const summary = stateToSummary(state);

  const isComplete = status === 'completed';
  await updateCheckRun(octokit, {
    owner: ctx.owner,
    repo: ctx.repo,
    checkRunId,
    status,
    ...(conclusion !== undefined ? { conclusion } : {}),
    ...(isComplete ? { completedAt: new Date().toISOString() } : {}),
    output: {
      title: 'Preview QA',
      summary,
      ...(body !== undefined ? { text: body } : {}),
    },
  });
}
