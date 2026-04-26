import { RunState, RunMode, EventType, ArtifactKind, ParseOutcome, BillingTier, TIER_LIMITS } from '@preview-qa/domain';
import { createRun, cancelSupersededRuns, createAuditEvent, countActiveRunsForInstallation, getInstallationById, countRunsForInstallationSince } from '@preview-qa/db';
import type { Pool } from 'pg';
import type { PullRequestEventEnvelope } from '@preview-qa/schemas';
import { upsertStickyComment, getInstallationOctokit, getPRChangedFiles } from '@preview-qa/github-adapter';
import { executeRun } from '@preview-qa/runner-playwright';
import type { Step } from '@preview-qa/runner-playwright';
import { BlobServiceClient } from '@azure/storage-blob';
import { formatPRComment, formatCheckBody } from '@preview-qa/reporter';
import type { ReportArtifact } from '@preview-qa/reporter';
import { parsePRBody, formatParseErrors, extractYamlBlock } from '@preview-qa/parser';
import { buildPlan, suggestMissingCoverage, formatSuggestionComment, storeRunSummary, retrieveSimilarRuns, formatSimilarRunsContext } from '@preview-qa/planner';
import { createLogger, getTracer, withSpan } from '@preview-qa/observability';
import { createAzureOpenAIClient } from '@preview-qa/ai';
import { handlePrReview } from './pr-review.js';
import { transition } from '../statemachine.js';
import { createInitialCheck, reportStateChange, reportStateChangeWithBody } from '../github-reporter.js';
import { pollForPreview } from '../preview-poller.js';
import { resolveStorageState } from '../loginProfile.js';
import type { OrchestratorConfig } from '../types.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

const tracer = getTracer('orchestrator');

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

  const { pullRequestId, sha, owner, repo, vercelProjectId, mode, githubNumber, prBody, isFork, authorLogin } = extended;

  await withSpan(
    tracer,
    'handle_pull_request',
    { installationId: String(installationId), repositoryId: String(repositoryId), sha },
    async (span) => {
      span.setAttribute('preview_qa.github_number', githubNumber);
      span.setAttribute('preview_qa.is_fork', isFork ?? false);

      const log = createLogger('orchestrator', {
        installationId: String(installationId),
        repositoryId: String(repositoryId),
        sha,
      });

      // Fork policy: downgrade to smoke-only, log audit event, and continue
      const effectiveMode = isFork ? RunMode.Smoke : (mode ?? RunMode.Smoke);
      if (isFork) {
        log.info({ githubNumber, authorLogin }, 'fork PR — downgrading to smoke-only');
        try {
          await createAuditEvent(pool, {
            installation_id: installationId,
            event_type: 'fork_policy.downgrade',
            actor: authorLogin ?? undefined,
            payload: {
              githubNumber,
              sha,
              repositoryId,
              reason: 'fork PR — authenticated run blocked, downgraded to smoke-only',
            },
          });
        } catch (err) {
          log.error({ err }, 'failed to write fork policy audit event');
        }
      }

      // Billing quota: check monthly run limit against installation tier
      const installation = await getInstallationById(pool, installationId);

      // Suspended installations are dropped silently
      if (installation?.suspended_at != null) {
        log.warn({ installationId }, 'dropping event — installation is suspended');
        return;
      }

      const tier = installation?.tier ?? BillingTier.Free;
      const tierLimits = TIER_LIMITS[tier] ?? TIER_LIMITS[BillingTier.Free];
      // Grace period: installation had a payment failure but is still within the 7-day window
      const inGracePeriod = installation?.grace_period_ends_at != null && installation.grace_period_ends_at > new Date();
      const billingPeriodStart = new Date();
      billingPeriodStart.setDate(1);
      billingPeriodStart.setHours(0, 0, 0, 0);
      const monthlyRunCount = await countRunsForInstallationSince(pool, installationId, billingPeriodStart);
      if (!inGracePeriod && monthlyRunCount >= tierLimits.runsPerMonth) {
        log.warn({ monthlyRunCount, limit: tierLimits.runsPerMonth, tier, installationId }, 'monthly run quota exceeded');
        try {
          const octokit = await getInstallationOctokit(config.github, Number(installationId));
          await upsertStickyComment(octokit, {
            owner: owner ?? '',
            repo: repo ?? '',
            pullNumber: githubNumber,
            body: formatQuotaExceededComment(tier, tierLimits.runsPerMonth),
          });
        } catch (err) {
          log.error({ err }, 'failed to post quota exceeded comment');
        }
        return;
      }

      // Concurrency cap: block new runs if installation is already at its limit
      const concurrencyCap = config.concurrencyCap ?? tierLimits.concurrencyCap;
      const activeCount = await countActiveRunsForInstallation(pool, installationId);
      if (activeCount >= concurrencyCap) {
        log.warn({ activeCount, concurrencyCap, installationId }, 'concurrency cap reached — run dropped');
        return;
      }

      await cancelSupersededRuns(pool, pullRequestId, sha);

      const run = await createRun(pool, {
        pull_request_id: pullRequestId,
        repository_id: repositoryId,
        installation_id: installationId,
        sha,
        mode: effectiveMode,
        triggered_by: 'push',
      });

      span.setAttribute('preview_qa.run_id', run.id);

      // Fire-and-forget: AI code review runs in parallel with the test pipeline.
      // A review failure must never block or crash the test run.
      if (config.ai) {
        void handlePrReview(
          { pool, config, log },
          {
            pullRequestId,
            githubNumber,
            sha,
            owner: owner ?? '',
            repo: repo ?? '',
            title: extended.title ?? '',
            body: prBody ?? null,
            installationGithubId: Number(installationId),
          },
        ).catch((err: unknown) => {
          log.error({ err }, 'PR review pipeline failed — non-fatal');
        });
      }

      const runLog = createLogger('orchestrator', {
        installationId: String(installationId),
        repositoryId: String(repositoryId),
        sha,
        runId: run.id,
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
        runLog.error({ err }, 'failed to create GitHub check');
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
          runLog.error({ message: pollResult.message }, 'preview poll error');
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
        runLog.warn({ errors: parseResult.errors }, 'QA block parse errors');
        try {
          const octokit = await getInstallationOctokit(config.github, Number(installationId));
          await upsertStickyComment(octokit, {
            owner: owner ?? '',
            repo: repo ?? '',
            pullNumber: githubNumber,
            body: formatParseErrors(parseResult.errors),
          });
        } catch (err) {
          runLog.error({ err }, 'failed to post parse error comment');
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

      // Fetch changed files for heuristic route detection (best-effort, skip on error)
      let changedFiles: string[] | undefined;
      if (!isFork) {
        try {
          const octokitForDiff = await getInstallationOctokit(config.github, Number(installationId));
          changedFiles = await getPRChangedFiles(octokitForDiff, owner ?? '', repo ?? '', githubNumber);
          runLog.info({ fileCount: changedFiles.length }, 'fetched PR changed files');
        } catch (err) {
          runLog.warn({ err }, 'failed to fetch PR changed files — heuristics skipped');
        }
      }

      // Build plan (persists to DB, resolves steps by mode)
      const parsedSteps = parseResult.outcome === ParseOutcome.Found ? parseResult.block.steps : null;
      const extracted = extractYamlBlock(prBody ?? null);
      const rawYaml = extracted.found ? extracted.yaml : null;
      // Fork PRs always use smoke steps regardless of parsed instructions
      const planParsedSteps = isFork ? null : (parsedSteps as never);
      const { testCases } = await buildPlan(pool, {
        runId: run.id,
        mode: effectiveMode,
        previewUrl: resolvedPreviewUrl ?? '',
        parsedSteps: planParsedSteps,
        rawYaml,
        ...(config.maxTestCasesPerPR !== undefined ? { maxTestCases: config.maxTestCasesPerPR } : {}),
        ...(changedFiles !== undefined ? { changedFiles } : {}),
      });
      const steps = (testCases[0]?.steps ?? []) as Step[];

      // AI plan suggestions (informational, non-blocking, only when AI is configured and files changed)
      if (config.ai && changedFiles && changedFiles.length > 0 && !isFork) {
        const allSteps = testCases.flatMap((tc) => tc.steps);
        void (async () => {
          try {
            const aiClient = createAzureOpenAIClient(config.ai!);
            const suggestions = await suggestMissingCoverage(aiClient, pool, {
              runId: run.id,
              changedFiles,
              existingSteps: allSteps,
              previewUrl: resolvedPreviewUrl ?? '',
              deployment: config.ai!.deployments.planSuggester,
            });
            const body = formatSuggestionComment(suggestions);
            if (body) {
              const octokit = await getInstallationOctokit(config.github, Number(installationId));
              await octokit.issues.createComment({
                owner: owner ?? '',
                repo: repo ?? '',
                issue_number: githubNumber,
                body,
              });
              runLog.info({ suggestionCount: suggestions.length }, 'posted AI plan suggestions');
            }
          } catch (err) {
            runLog.warn({ err }, 'AI plan suggestion failed — skipped');
          }
        })();
      }

      // Advance to Running
      const runningResult = await transition(pool, run.id, RunState.Planning, RunState.Running);
      if (!runningResult.success) return;
      await reportStateChange(reporterCtx, checkRunId, RunState.Running);

      // Resolve login profile storage state if specified
      let storageStatePath: string | undefined;
      const loginProfile = parseResult.outcome === ParseOutcome.Found ? parseResult.block.login : undefined;
      if (loginProfile !== undefined && config.keyVaultUrl !== undefined) {
        try {
          storageStatePath = await resolveStorageState(config.keyVaultUrl, loginProfile, run.id);
        } catch (err) {
          runLog.error({ err, loginProfile }, 'failed to resolve login profile');
        }
      }

      const outputDir = path.join(os.tmpdir(), `run-${run.id}`);
      runLog.info({ stepCount: steps.length, previewUrl: resolvedPreviewUrl }, 'executing run');
      const runnerResult = await executeRun({
        previewUrl: resolvedPreviewUrl ?? '',
        steps,
        outputDir,
        ...(storageStatePath !== undefined ? { storageStatePath } : {}),
      });
      runLog.info(
        { outcome: runnerResult.outcome, durationMs: runnerResult.durationMs, failureCategory: runnerResult.failureCategory },
        'runner finished',
      );

      // Store run embedding for future retrieval (best-effort, non-blocking)
      if (config.ai && runnerResult.outcome === 'fail') {
        const failedStep = runnerResult.steps.find((s) => !s.ok);
        const summaryText = failedStep?.error
          ? `${failedStep.type} failed: ${failedStep.error}`
          : `run failed after ${runnerResult.durationMs}ms`;
        void storeRunSummary(createAzureOpenAIClient(config.ai), pool, {
          runId: run.id,
          summaryText,
          deployment: config.ai.deployments.embeddings,
          model: config.ai.deployments.embeddings,
        }).catch((err: unknown) => runLog.warn({ err }, 'failed to store run embedding — skipped'));
      }

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

      // Retrieve similar past failures for context (best-effort)
      let similarRunsContext = '';
      if (config.ai && runnerResult.outcome === 'fail') {
        try {
          const failedStep = runnerResult.steps.find((s) => !s.ok);
          const queryText = failedStep?.error
            ? `${failedStep.type} failed: ${failedStep.error}`
            : `run failed after ${runnerResult.durationMs}ms`;
          const similarRuns = await retrieveSimilarRuns(createAzureOpenAIClient(config.ai), pool, {
            summaryText: queryText,
            deployment: config.ai.deployments.embeddings,
            excludeRunId: run.id,
            limit: 3,
          });
          similarRunsContext = formatSimilarRunsContext(similarRuns);
          if (similarRunsContext) {
            runLog.info({ similarRunCount: similarRuns.length }, 'retrieved similar past runs');
          }
        } catch (err) {
          runLog.warn({ err }, 'failed to retrieve similar runs — skipped');
        }
      }

      const report = {
        runId: run.id,
        outcome: runnerResult.outcome,
        durationMs: runnerResult.durationMs,
        ...(resolvedPreviewUrl !== undefined ? { previewUrl: resolvedPreviewUrl } : {}),
        sha,
        steps: runnerResult.steps,
        artifacts,
        ...(runnerResult.failureCategory !== undefined ? { failureCategory: runnerResult.failureCategory } : {}),
        ...(runnerResult.timedOut ? { timedOut: true } : {}),
        ...(similarRunsContext ? { similarRunsContext } : {}),
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
        runLog.error({ err }, 'failed to post PR comment');
      }

      const finalState = runnerResult.outcome === 'pass' ? RunState.Completed : RunState.Failed;
      const completedResult = await transition(pool, run.id, RunState.Reporting, finalState, {
        completedAt: new Date(),
      });
      if (!completedResult.success) return;

      await reportStateChangeWithBody(reporterCtx, checkRunId, finalState, formatCheckBody(report));
    },
  );
}

function formatQuotaExceededComment(tier: BillingTier, limit: number): string {
  const upgradeUrl = 'https://preview-qa.dev/pricing';
  return [
    '## preview-qa: Monthly Run Quota Reached',
    '',
    `Your **${tier}** plan includes **${limit} runs/month** and you've reached the limit for this billing period.`,
    '',
    'Automated QA runs are paused until the quota resets at the start of next month, or until you upgrade.',
    '',
    `[**Upgrade your plan →**](${upgradeUrl})`,
    '',
    '_This comment will be updated when your quota resets._',
  ].join('\n');
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
