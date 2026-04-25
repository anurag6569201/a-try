import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { chatComplete, logModelTrace } from '../client.js';
import type { FailureSummarizerInput, FailureSummarizerOutput, PromptCallOptions } from '../types.js';

const SYSTEM_PROMPT = `You are a QA failure analyst for web applications.
Given a Playwright step that failed, return a JSON object with a human-readable failure summary and an optional suggested fix.

Return format:
{
  "summary": "<one or two sentence plain-English explanation of what went wrong>",
  "suggestedFix": "<optional: concrete suggestion for how the developer might fix it>"
}

Rules:
- "summary" is required. Be specific about what the test expected vs what it found.
- "suggestedFix" is optional. Only include if you have a concrete, actionable suggestion.
- Do not include debugging steps — address the developer, not a QA engineer.
- Only return valid JSON. No markdown fences.`;

export async function runFailureSummarizer(
  client: AzureOpenAI,
  pool: Pool,
  deployment: string,
  input: FailureSummarizerInput,
  opts: PromptCallOptions,
): Promise<FailureSummarizerOutput> {
  const userMessage = JSON.stringify({
    stepType: input.stepType,
    error: input.error,
    previewUrl: input.previewUrl,
    ...(input.pageTitle !== undefined ? { pageTitle: input.pageTitle } : {}),
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

  return JSON.parse(content) as FailureSummarizerOutput;
}
