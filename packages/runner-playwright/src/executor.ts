import { chromium } from 'playwright';
import { StepType, FailureCategory } from '@preview-qa/domain';
import type { Step, StepResult, RunnerInput, RunnerResult } from './types.js';
import path from 'path';
import fs from 'fs';

const DEFAULT_STEP_TIMEOUT_MS = 30_000;
const DEFAULT_HARD_KILL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_STEP_ATTEMPTS = 3;

// Errors that are worth retrying (network / timing transients)
const TRANSIENT_PATTERNS = [
  /net::/i,
  /timeout/i,
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /socket hang up/i,
  /navigation/i,
  /Target closed/i,
];

function isTransient(error: string): boolean {
  return TRANSIENT_PATTERNS.some((p) => p.test(error));
}

function classifyFailure(steps: StepResult[], timedOut: boolean): FailureCategory {
  if (timedOut) return FailureCategory.EnvironmentIssue;

  const failedStep = steps.find((s) => !s.ok);
  if (!failedStep) return FailureCategory.ProductBug;

  const error = failedStep.error ?? '';

  if (isTransient(error)) {
    // If we retried and still failed, it may be flaky
    if ((failedStep.attempts ?? 1) > 1) return FailureCategory.Flaky;
    return FailureCategory.EnvironmentIssue;
  }

  if (/assert|expected|not found|visible|hidden/i.test(error)) {
    return FailureCategory.ProductBug;
  }

  return FailureCategory.ProductBug;
}

export async function executeRun(input: RunnerInput): Promise<RunnerResult> {
  const {
    steps,
    outputDir,
    stepTimeoutMs = DEFAULT_STEP_TIMEOUT_MS,
    hardKillMs = DEFAULT_HARD_KILL_MS,
    storageStatePath,
  } = input;

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext(
    storageStatePath !== undefined ? { storageState: storageStatePath } : {},
  );

  await context.tracing.start({ screenshots: true, snapshots: true });

  const page = await context.newPage();
  page.setDefaultTimeout(stepTimeoutMs);
  page.setDefaultNavigationTimeout(stepTimeoutMs);

  const stepResults: StepResult[] = [];
  const runStart = Date.now();
  let failed = false;
  let timedOut = false;
  let tracePath: string | undefined;
  let errorScreenshotPath: string | undefined;

  // Hard kill timer
  const hardKillTimer = setTimeout(() => {
    timedOut = true;
    failed = true;
    page.close().catch(() => undefined);
  }, hardKillMs);

  try {
    for (const step of steps) {
      if (timedOut) break;

      const stepStart = Date.now();
      let result: StepResult;

      // Retry loop for transient errors
      let lastError = '';
      let attempts = 0;
      let succeeded = false;

      while (attempts < MAX_STEP_ATTEMPTS && !succeeded && !timedOut) {
        attempts++;
        const backoffMs = attempts > 1 ? Math.min(1000 * Math.pow(2, attempts - 2), 8000) : 0;
        if (backoffMs > 0) await sleep(backoffMs);

        try {
          result = await executeStep(page, step, outputDir, stepResults.length);
          succeeded = true;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (!isTransient(lastError) || attempts >= MAX_STEP_ATTEMPTS) break;
        }
      }

      if (!succeeded) {
        const screenshotPath = path.join(outputDir, `error-step-${stepResults.length}.png`);
        try {
          await page.screenshot({ path: screenshotPath, fullPage: true });
          errorScreenshotPath = screenshotPath;
        } catch {
          // best-effort screenshot
        }
        result = {
          type: step.type,
          ok: false,
          durationMs: Date.now() - stepStart,
          error: lastError,
          ...(attempts > 1 ? { attempts } : {}),
        };
        failed = true;
      } else {
        // succeeded — attach attempt count if > 1 (indicates flakiness)
        result = { ...result!, ...(attempts > 1 ? { attempts } : {}) };
      }

      stepResults.push(result);
      if (!result.ok) {
        failed = true;
        break;
      }
    }
  } finally {
    clearTimeout(hardKillTimer);
    const traceOut = path.join(outputDir, 'trace.zip');
    try {
      await context.tracing.stop({ path: traceOut });
      if (failed) tracePath = traceOut;
    } catch {
      // best-effort trace
    }
    await context.close();
    await browser.close();
  }

  const failureCategory = failed
    ? classifyFailure(stepResults, timedOut)
    : undefined;

  return {
    outcome: failed ? 'fail' : 'pass',
    steps: stepResults,
    durationMs: Date.now() - runStart,
    ...(tracePath !== undefined ? { tracePath } : {}),
    ...(errorScreenshotPath !== undefined ? { errorScreenshotPath } : {}),
    ...(failureCategory !== undefined ? { failureCategory } : {}),
    ...(timedOut ? { timedOut: true } : {}),
  };
}

async function executeStep(
  page: import('playwright').Page,
  step: Step,
  outputDir: string,
  index: number,
): Promise<StepResult> {
  const start = Date.now();

  switch (step.type) {
    case StepType.Navigate: {
      const url = step.url ?? step.value;
      if (!url) throw new Error('navigate step requires url or value');
      await page.goto(url, { waitUntil: 'networkidle' });
      break;
    }

    case StepType.Assert200: {
      const url = step.url ?? page.url();
      const response = await page.request.get(url);
      if (!response.ok()) {
        throw new Error(`Expected 200 from ${url}, got ${response.status()}`);
      }
      break;
    }

    case StepType.AssertTitle: {
      const title = await page.title();
      const expected = step.value ?? '';
      if (!title.includes(expected)) {
        throw new Error(`Title "${title}" does not contain "${expected}"`);
      }
      break;
    }

    case StepType.AssertVisible: {
      if (!step.selector) throw new Error('assert_visible requires selector');
      await page.locator(step.selector).waitFor({ state: 'visible' });
      break;
    }

    case StepType.AssertNotVisible: {
      if (!step.selector) throw new Error('assert_not_visible requires selector');
      await page.locator(step.selector).waitFor({ state: 'hidden' });
      break;
    }

    case StepType.Fill: {
      if (!step.selector) throw new Error('fill requires selector');
      if (step.value === undefined) throw new Error('fill requires value');
      await page.locator(step.selector).fill(step.value);
      break;
    }

    case StepType.Click: {
      if (!step.selector) throw new Error('click requires selector');
      await page.locator(step.selector).click();
      break;
    }

    case StepType.Screenshot: {
      const label = step.label ?? `step-${index}`;
      const screenshotPath = path.join(outputDir, `${label}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        type: step.type,
        ok: true,
        durationMs: Date.now() - start,
        screenshotPath,
      };
    }
  }

  return {
    type: step.type,
    ok: true,
    durationMs: Date.now() - start,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
