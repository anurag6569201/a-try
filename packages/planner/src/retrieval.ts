import type { Pool } from 'pg';
import { embedText } from '@preview-qa/ai';
import { upsertRunEmbedding, findSimilarRuns } from '@preview-qa/db';
import type { OpenAILike } from '@preview-qa/ai';
import type { SimilarRun } from '@preview-qa/db';

export interface StoreRunSummaryInput {
  runId: string;
  summaryText: string;
  deployment: string;
  model: string;
}

export async function storeRunSummary(
  client: OpenAILike,
  pool: Pool,
  input: StoreRunSummaryInput,
): Promise<void> {
  const embedding = await embedText(
    client as Parameters<typeof embedText>[0],
    input.deployment,
    input.summaryText,
  );
  await upsertRunEmbedding(pool, {
    run_id: input.runId,
    summary_text: input.summaryText,
    embedding,
    model: input.model,
  });
}

export interface RetrieveSimilarRunsInput {
  summaryText: string;
  deployment: string;
  excludeRunId?: string;
  limit?: number;
}

export async function retrieveSimilarRuns(
  client: OpenAILike,
  pool: Pool,
  input: RetrieveSimilarRunsInput,
): Promise<SimilarRun[]> {
  const embedding = await embedText(
    client as Parameters<typeof embedText>[0],
    input.deployment,
    input.summaryText,
  );
  return findSimilarRuns(pool, embedding, input.limit ?? 3, input.excludeRunId);
}

export function formatSimilarRunsContext(similarRuns: SimilarRun[]): string {
  if (similarRuns.length === 0) return '';
  const items = similarRuns
    .map((r, i) => `${i + 1}. [similarity: ${(1 - r.distance).toFixed(2)}] ${r.summary_text}`)
    .join('\n');
  return `Similar past failures for context:\n${items}`;
}
