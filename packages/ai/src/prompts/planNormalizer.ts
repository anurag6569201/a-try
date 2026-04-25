import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { chatComplete, logModelTrace } from '../client.js';
import type { PlanNormalizerInput, PlanNormalizerOutput, PromptCallOptions } from '../types.js';

const SYSTEM_PROMPT = `You are a Playwright test step normalizer.
Given a step type and a natural-language instruction, return a JSON object with the canonical fields for that step type.

Rules:
- For "fill" and "click": return { "selector": "<css or aria selector>", "reasoning": "<why>" }
- For "navigate": return { "url": "<absolute URL>", "reasoning": "<why>" }
- For "assert_visible" / "assert_not_visible": return { "selector": "<css or aria selector>", "reasoning": "<why>" }
- For "assert_title": return { "value": "<expected substring>", "reasoning": "<why>" }
- For "screenshot": return { "reasoning": "<description>" }
- Always include "reasoning".
- Only return valid JSON. No markdown fences.`;

export async function runPlanNormalizer(
  client: AzureOpenAI,
  pool: Pool,
  deployment: string,
  input: PlanNormalizerInput,
  opts: PromptCallOptions,
): Promise<PlanNormalizerOutput> {
  const userMessage = JSON.stringify({
    stepType: input.stepType,
    instruction: input.rawInstruction,
    previewUrl: input.previewUrl,
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

  return JSON.parse(content) as PlanNormalizerOutput;
}
