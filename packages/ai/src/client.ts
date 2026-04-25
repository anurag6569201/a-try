import OpenAI, { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import type { AzureOpenAIConfig, ModelTraceRow } from './types.js';

export function createAzureOpenAIClient(config: AzureOpenAIConfig): AzureOpenAI {
  return new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: '2024-10-21',
    deployment: config.deployments.planNormalizer, // default deployment; callers pass deployment per-call
  });
}

// Allow injecting a plain OpenAI client in tests
export type OpenAILike = OpenAI;

export async function logModelTrace(pool: Pool, trace: ModelTraceRow): Promise<void> {
  await pool.query(
    `INSERT INTO model_trace
       (run_id, prompt_name, model, input_tokens, output_tokens, latency_ms)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      trace.runId,
      trace.promptName,
      trace.model,
      trace.inputTokens,
      trace.outputTokens,
      trace.latencyMs,
    ],
  );
}

export async function chatComplete(
  client: AzureOpenAI,
  deployment: string,
  systemPrompt: string,
  userMessage: string,
): Promise<{ content: string; inputTokens: number | null; outputTokens: number | null }> {
  const response = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  const choice = response.choices[0];
  const content = choice?.message.content ?? '';
  const inputTokens = response.usage?.prompt_tokens ?? null;
  const outputTokens = response.usage?.completion_tokens ?? null;

  return { content, inputTokens, outputTokens };
}
