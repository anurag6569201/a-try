import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { FailureCategory } from '@preview-qa/domain';
import { chatComplete, logModelTrace } from '../client.js';
import type { RiskClassifierInput, RiskClassifierOutput, PromptCallOptions } from '../types.js';

const VALID_CATEGORIES = Object.values(FailureCategory).join(' | ');

const SYSTEM_PROMPT = `You are a QA risk classifier for web application test failures.
Given a failed Playwright step and a human-readable failure summary, classify the failure into exactly one category.

Valid categories: ${VALID_CATEGORIES}

Definitions:
- product_bug: The app itself has a defect (element missing, wrong behaviour, 4xx/5xx response).
- test_bug: The test step is wrong (bad selector, wrong assertion value, incorrect URL).
- environment_issue: The preview deployment isn't working correctly (site won't load, 503, DNS failure).
- flaky: Non-deterministic failure — likely passes on retry (timing, network blip, race condition).
- needs_clarification: Cannot determine without more context.

Return format:
{
  "category": "<one of the valid categories>",
  "confidence": "high" | "medium" | "low",
  "reasoning": "<one sentence explaining the classification>"
}

Only return valid JSON. No markdown fences.`;

export async function runRiskClassifier(
  client: AzureOpenAI,
  pool: Pool,
  deployment: string,
  input: RiskClassifierInput,
  opts: PromptCallOptions,
): Promise<RiskClassifierOutput> {
  const userMessage = JSON.stringify({
    stepType: input.stepType,
    error: input.error,
    failureSummary: input.failureSummary,
  });

  const start = Date.now();
  const { content, inputTokens, outputTokens } = await chatComplete(
    client,
    deployment,
    SYSTEM_PROMPT,
    userMessage,
  );
  const latencyMs = Date.now() - start;

  await logModelTrace(pool, {
    runId: opts.runId,
    promptName: opts.promptName,
    model: deployment,
    inputTokens,
    outputTokens,
    latencyMs,
  });

  return JSON.parse(content) as RiskClassifierOutput;
}
