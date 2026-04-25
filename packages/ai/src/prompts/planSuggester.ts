import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { chatComplete, logModelTrace } from '../client.js';
import type { PlanSuggesterInput, PlanSuggesterOutput, PromptCallOptions } from '../types.js';

const SYSTEM_PROMPT = `You are a QA coverage advisor for a web application.
Given a list of changed files in a pull request and an existing test plan, identify routes or interactions that are likely affected but not yet covered.

Rules:
- Focus only on user-facing routes and API endpoints derived from the changed files.
- Do not suggest steps that are already covered by the existing plan (same URL and step type).
- Each suggestion must include: "route" (URL path or description), "reason" (why this needs coverage), "stepType" (one of: navigate, assert_visible, fill, click, screenshot).
- Return at most 5 suggestions. Return fewer if coverage looks good.
- Return a JSON object: { "suggestions": [ { "route": "...", "reason": "...", "stepType": "..." }, ... ] }
- Only return valid JSON. No markdown fences. No explanation outside the JSON.`;

export async function runPlanSuggester(
  client: AzureOpenAI,
  pool: Pool,
  deployment: string,
  input: PlanSuggesterInput,
  opts: PromptCallOptions,
): Promise<PlanSuggesterOutput> {
  const userMessage = JSON.stringify({
    changedFiles: input.changedFiles,
    existingSteps: input.existingSteps,
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

  const parsed = JSON.parse(content) as PlanSuggesterOutput;
  if (!Array.isArray(parsed.suggestions)) {
    return { suggestions: [] };
  }
  return parsed;
}
