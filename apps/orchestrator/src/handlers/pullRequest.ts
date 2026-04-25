import { RunState, RunMode, EventType, ArtifactKind, ParseOutcome } from '@preview-qa/domain';
import { createRun, cancelSupersededRuns } from '@preview-qa/db';
import type { Pool } from 'pg';
import type { PullRequestEventEnvelope } from '@preview-qa/schemas';
import { upsertStickyComment, getInstallationOctokit } from '@preview-qa/github-adapter';
import { executeRun } from '@preview-qa/runner-playwright';
import type { Step } from '@preview-qa/runner-playwright';
import { BlobServiceClient } from '@azure/storage-blob';
import { formatPRComment, formatCheckBody } from '@preview-qa/reporter';
import type { ReportArtifact } from '@preview-qa/reporter';
import { parsePRBody, formatParseErrors, extractYamlBlock } from '@preview-qa/parser';
import { buildPlan } from '@preview-qa/planner';
import { transition } from '../statemachine.js';
import { createInitialCheck, reportStateChange, reportStateChangeWithBody } from '../github-reporter.js';
import { pollForPreview } from '../preview-poller.js';
import type { OrchestratorConfig } from '../types.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

export async function handlePullRequestEvent(
  pool: Pool,
  config: OrchestratorConfig,
  envelope: PullRequestEventEnvelope,
): Promise<void> {
  const { eventType, payload, installationId, repositoryId } = envelope;

  if (eventType === EventType.PullRequestClosed) {
    return;
  }

  const extended = payload as typeof payload & {
    owner: string;
    repo: string;
    vercelProjectId?: string;
    mode?: RunMode;
    githubNumber: number;
    prBody?: string | null;
  };

  const { pullRequestId, sha, owner, repo, vercelProjectId, mode, githubNumber, prBody } = extended;

  await cancelSupersededRuns(pool, pullRequestId, sha);

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

  // Poll for preview
  let resolvedPreviewUrl: string | undefined;

  if (vercelProjectId) {
    const pollResult = await pollForPreview(
      {
        apiToken: config.vercel.apiToken,
        ...(config.vercel.teamId !== undefined ? { teamId: config.vercel.teamId } : {}),
      },
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

    resolvedPreviewUrl = pollResult.url;
  }

  // Parse PR body for instruction block
  const parseResult = parsePRBody(prBody ?? null);

  // On parse error: post guidance comment then fall through to smoke
  if (parseResult.outcome === ParseOutcome.Error) {
    console.warn(`[${run.id}] QA block parse errors:`, parseResult.errors);
    try {
      const octokit = await getInstallationOctokit(config.github, Number(installationId));
      await upsertStickyComment(octokit, {
        owner: owner ?? '',
        repo: repo ?? '',
        pullNumber: githubNumber,
        body: formatParseErrors(parseResult.errors),
      });
    } catch (err) {
      console.error(`[${run.id}] Failed to post parse error comment:`, err);
    }
  }

  // Advance to Planning
  const planningResult = await transition(
    pool,
    run.id,
    RunState.WaitingForPreview,
    RunState.Planning,
    resolvedPreviewUrl !== undefined ? { previewUrl: resolvedPreviewUrl } : {},
  );
  if (!planningResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Planning);

  // Build plan (persists to DB, resolves steps by mode)
  const parsedSteps = parseResult.outcome === ParseOutcome.Found ? parseResult.block.steps : null;
  const extracted = extractYamlBlock(prBody ?? null);
  const rawYaml = extracted.found ? extracted.yaml : null;
  const { testCases } = await buildPlan(pool, {
    runId: run.id,
    mode: mode ?? RunMode.Smoke,
    previewUrl: resolvedPreviewUrl ?? '',
    parsedSteps: parsedSteps as never,
    rawYaml,
  });
  const steps = (testCases[0]?.steps ?? []) as Step[];

  // Advance to Running
  const runningResult = await transition(pool, run.id, RunState.Planning, RunState.Running);
  if (!runningResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Running);

  const outputDir = path.join(os.tmpdir(), `run-${run.id}`);
  const runnerResult = await executeRun({
    previewUrl: resolvedPreviewUrl ?? '',
    steps,
    outputDir,
  });

  // Upload artifacts
  const artifacts = await uploadRunArtifacts(config, run.id, runnerResult);

  // Cleanup temp dir
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }

  // Advance to Analyzing
  const analyzingResult = await transition(pool, run.id, RunState.Running, RunState.Analyzing, {
    startedAt: new Date(),
  });
  if (!analyzingResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Analyzing);

  // Advance to Reporting
  const reportingResult = await transition(pool, run.id, RunState.Analyzing, RunState.Reporting);
  if (!reportingResult.success) return;
  await reportStateChange(reporterCtx, checkRunId, RunState.Reporting);

  const report = {
    runId: run.id,
    outcome: runnerResult.outcome,
    durationMs: runnerResult.durationMs,
    ...(resolvedPreviewUrl !== undefined ? { previewUrl: resolvedPreviewUrl } : {}),
    sha,
    steps: runnerResult.steps,
    artifacts,
  };

  try {
    const octokit = await getInstallationOctokit(config.github, Number(installationId));
    await upsertStickyComment(octokit, {
      owner: owner ?? '',
      repo: repo ?? '',
      pullNumber: githubNumber,
      body: formatPRComment(report),
    });
  } catch (err) {
    console.error(`[${run.id}] Failed to post PR comment:`, err);
  }

  const finalState = runnerResult.outcome === 'pass' ? RunState.Completed : RunState.Failed;
  const completedResult = await transition(pool, run.id, RunState.Reporting, finalState, {
    completedAt: new Date(),
  });
  if (!completedResult.success) return;

  await reportStateChangeWithBody(reporterCtx, checkRunId, finalState, formatCheckBody(report));
}

async function uploadRunArtifacts(
  config: OrchestratorConfig,
  runId: string,
  runnerResult: Awaited<ReturnType<typeof executeRun>>,
): Promise<ReportArtifact[]> {
  const toUpload: Array<{ localPath: string; kind: ArtifactKind }> = [];

  for (const step of runnerResult.steps) {
    if (step.screenshotPath) {
      toUpload.push({ localPath: step.screenshotPath, kind: ArtifactKind.Screenshot });
    }
  }
  if (runnerResult.errorScreenshotPath) {
    toUpload.push({ localPath: runnerResult.errorScreenshotPath, kind: ArtifactKind.Screenshot });
  }
  if (runnerResult.tracePath) {
    toUpload.push({ localPath: runnerResult.tracePath, kind: ArtifactKind.Trace });
  }

  if (toUpload.length === 0) return [];

  const blobClient = BlobServiceClient.fromConnectionString(config.storage.connectionString);
  const container = blobClient.getContainerClient(config.storage.containerName);

  return Promise.all(
    toUpload.map(async ({ localPath, kind }) => {
      const filename = path.basename(localPath);
      const blobName = `runs/${runId}/${filename}`;
      const block = container.getBlockBlobClient(blobName);
      await block.uploadFile(localPath, {
        blobHTTPHeaders: {
          blobContentType: localPath.endsWith('.png') ? 'image/png' : 'application/zip',
        },
      });
      return { kind, blobUrl: block.url, filename } satisfies ReportArtifact;
    }),
  );
}
