import { chromium } from 'playwright';
import { StepType } from '@preview-qa/domain';
import type { Step, StepResult, RunnerInput, RunnerResult } from './types.js';
import path from 'path';
import fs from 'fs';

const DEFAULT_TIMEOUT_MS = 30_000;
const STEP_TIMEOUT_MS = 10_000;

export async function executeRun(input: RunnerInput): Promise<RunnerResult> {
  const { steps, outputDir, timeoutMs = DEFAULT_TIMEOUT_MS, storageStatePath } = input;

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext(
    storageStatePath !== undefined ? { storageState: storageStatePath } : {},
  );

  await context.tracing.start({ screenshots: true, snapshots: true });

  const page = await context.newPage();
  page.setDefaultTimeout(STEP_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(timeoutMs);

  const stepResults: StepResult[] = [];
  const runStart = Date.now();
  let failed = false;
  let tracePath: string | undefined;
  let errorScreenshotPath: string | undefined;

  try {
    for (const step of steps) {
      const stepStart = Date.now();
      let result: StepResult;

      try {
        result = await executeStep(page, step, outputDir, stepResults.length);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
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
          error,
        };
        failed = true;
      }

      stepResults.push(result);
      if (!result.ok) {
        failed = true;
        break;
      }
    }
  } finally {
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

  return {
    outcome: failed ? 'fail' : 'pass',
    steps: stepResults,
    durationMs: Date.now() - runStart,
    ...(tracePath !== undefined ? { tracePath } : {}),
    ...(errorScreenshotPath !== undefined ? { errorScreenshotPath } : {}),
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
