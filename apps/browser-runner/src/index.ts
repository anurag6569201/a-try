import { initTelemetry, shutdownTelemetry, createLogger } from '@preview-qa/observability';
import { executeRun } from '@preview-qa/runner-playwright';
import { ArtifactKind } from '@preview-qa/domain';
import { uploadArtifacts } from './uploader.js';
import type { Step } from '@preview-qa/runner-playwright';
import os from 'os';
import path from 'path';
import fs from 'fs';

interface RunnerJobInput {
  runId: string;
  previewUrl: string;
  steps: Step[];
}

interface RunnerJobOutput {
  runId: string;
  outcome: 'pass' | 'fail';
  durationMs: number;
  artifacts: Array<{
    kind: ArtifactKind;
    blobUrl: string;
    filename: string;
    sizeBytes: number;
  }>;
  stepResults: Array<{
    type: string;
    ok: boolean;
    durationMs: number;
    error?: string;
  }>;
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

async function main(): Promise<void> {
  initTelemetry({
    serviceName: 'browser-runner',
    ...(process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'] !== undefined
      ? { appInsightsConnectionString: process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'] }
      : {}),
  });

  const inputJson = requireEnv('RUNNER_INPUT');
  const storageConnectionString = requireEnv('AZURE_STORAGE_CONNECTION_STRING');
  const containerName = process.env['AZURE_BLOB_CONTAINER'] ?? 'artifacts';

  const jobInput = JSON.parse(inputJson) as RunnerJobInput;
  const { runId, previewUrl, steps } = jobInput;

  const log = createLogger('browser-runner', { runId });
  const outputDir = path.join(os.tmpdir(), `run-${runId}`);

  log.info({ previewUrl, stepCount: steps.length }, 'starting run');

  const result = await executeRun({ previewUrl, steps, outputDir });

  log.info({ outcome: result.outcome, durationMs: result.durationMs }, 'run complete');

  // Collect artifacts to upload
  const toUpload: Array<{ localPath: string; kind: ArtifactKind }> = [];

  for (const step of result.steps) {
    if (step.screenshotPath) {
      toUpload.push({ localPath: step.screenshotPath, kind: ArtifactKind.Screenshot });
    }
  }

  if (result.errorScreenshotPath) {
    toUpload.push({ localPath: result.errorScreenshotPath, kind: ArtifactKind.Screenshot });
  }

  if (result.tracePath) {
    toUpload.push({ localPath: result.tracePath, kind: ArtifactKind.Trace });
  }

  let uploadedArtifacts: RunnerJobOutput['artifacts'] = [];
  if (toUpload.length > 0) {
    uploadedArtifacts = await uploadArtifacts(
      { connectionString: storageConnectionString, containerName, runId },
      toUpload,
    );
    log.info({ count: uploadedArtifacts.length }, 'artifacts uploaded');
  }

  const output: RunnerJobOutput = {
    runId,
    outcome: result.outcome,
    durationMs: result.durationMs,
    artifacts: uploadedArtifacts,
    stepResults: result.steps.map((s) => ({
      type: s.type,
      ok: s.ok,
      durationMs: s.durationMs,
      ...(s.error !== undefined ? { error: s.error } : {}),
    })),
  };

  // Write result JSON to stdout for the Container Apps Job harness to capture
  process.stdout.write(JSON.stringify(output) + '\n');

  // Cleanup temp dir
  try {
    fs.rmSync(outputDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }

  await shutdownTelemetry();
}

main().catch((err: unknown) => {
  console.error('Fatal:', err);
  process.exit(1);
});
