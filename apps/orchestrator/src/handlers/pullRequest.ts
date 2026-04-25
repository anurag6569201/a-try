import { RunState, RunMode, EventType } from '@preview-qa/domain';
import { createRun, cancelSupersededRuns } from '@preview-qa/db';
import type { Pool } from 'pg';
import type { PullRequestEventEnvelope } from '@preview-qa/schemas';
import { transition } from '../statemachine.js';
import { createInitialCheck, reportStateChange } from '../github-reporter.js';
import { pollForPreview } from '../preview-poller.js';
import type { OrchestratorConfig } from '../types.js';

export async function handlePullRequestEvent(
  pool: Pool,
  config: OrchestratorConfig,
  envelope: PullRequestEventEnvelope,
): Promise<void> {
  const { eventType, payload, installationId, repositoryId } = envelope;

  if (eventType === EventType.PullRequestClosed) {
    return;
  }

  const { pullRequestId, sha, githubNumber: _githubNumber, owner, repo, vercelProjectId, mode } = payload as typeof payload & {
    owner: string;
    repo: string;
    vercelProjectId?: string;
    mode?: RunMode;
  };

  // Cancel any active runs for older SHAs on this PR
  await cancelSupersededRuns(pool, pullRequestId, sha);

  // Create a new run record
  const run = await createRun(pool, {
    pull_request_id: pullRequestId,
    repository_id: repositoryId,
    installation_id: installationId,
    sha,
    mode: mode ?? RunMode.Smoke,
    triggered_by: 'push',
  });

  const reporterCtx = {
    config: config.github,
    installationId: Number(installationId),
    owner: owner ?? '',
    repo: repo ?? '',
    sha,
  };

  // Create initial GitHub Check
  let checkRunId: number;
  try {
    checkRunId = await createInitialCheck(reporterCtx, run.id);
    await transition(pool, run.id, RunState.Queued, RunState.WaitingForPreview, {
      githubCheckId: checkRunId,
    });
    await reportStateChange(reporterCtx, checkRunId, RunState.WaitingForPreview);
  } catch (err) {
    console.error(`[${run.id}] Failed to create GitHub check:`, err);
    await transition(pool, run.id, RunState.Queued, RunState.Failed);
    return;
  }

  // Poll for Vercel preview
  if (!vercelProjectId) {
    // No Vercel project configured — skip polling, go straight to planning
    await advanceToPlanning(pool, config, reporterCtx, run.id, checkRunId, undefined);
    return;
  }

  const pollResult = await pollForPreview(
    { apiToken: config.vercel.apiToken, ...(config.vercel.teamId !== undefined ? { teamId: config.vercel.teamId } : {}) },
    vercelProjectId,
    sha,
  );

  if (pollResult.status === 'timeout') {
    await transition(pool, run.id, RunState.WaitingForPreview, RunState.BlockedEnvironment);
    await reportStateChange(reporterCtx, checkRunId, RunState.BlockedEnvironment);
    return;
  }

  if (pollResult.status === 'error') {
    console.error(`[${run.id}] Preview poll error: ${pollResult.message}`);
    await transition(pool, run.id, RunState.WaitingForPreview, RunState.Failed);
    await reportStateChange(reporterCtx, checkRunId, RunState.Failed);
    return;
  }

  await advanceToPlanning(pool, config, reporterCtx, run.id, checkRunId, pollResult.url);
}

async function advanceToPlanning(
  pool: Pool,
  _config: OrchestratorConfig,
  reporterCtx: Parameters<typeof reportStateChange>[0],
  runId: string,
  checkRunId: number,
  previewUrl: string | undefined,
): Promise<void> {
  const planningResult = await transition(
    pool,
    runId,
    RunState.WaitingForPreview,
    RunState.Planning,
    previewUrl !== undefined ? { previewUrl } : {},
  );

  if (!planningResult.success) {
    // Run was likely canceled by a newer push — nothing to do
    return;
  }

  await reportStateChange(reporterCtx, checkRunId, RunState.Planning);

  // Sprint 1.4 will wire in actual planning + running.
  // For now, immediately mark as completed to close the GitHub check.
  const runningResult = await transition(pool, runId, RunState.Planning, RunState.Running);
  if (!runningResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Running);

  const analyzingResult = await transition(pool, runId, RunState.Running, RunState.Analyzing, {
    startedAt: new Date(),
  });
  if (!analyzingResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Analyzing);

  const reportingResult = await transition(pool, runId, RunState.Analyzing, RunState.Reporting);
  if (!reportingResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Reporting);

  const completedResult = await transition(pool, runId, RunState.Reporting, RunState.Completed, {
    completedAt: new Date(),
  });
  if (!completedResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Completed);
}
