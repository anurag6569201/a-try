import type { Pool } from 'pg';
import type { UpsertRunEmbeddingInput, SimilarRun } from '../types.js';

export async function upsertRunEmbedding(
  pool: Pool,
  input: UpsertRunEmbeddingInput,
): Promise<void> {
  // pgvector literal: '[0.1,0.2,...]'
  const vectorLiteral = `[${input.embedding.join(',')}]`;
  await pool.query(
    `INSERT INTO run_embedding (run_id, summary_text, embedding, model)
     VALUES ($1, $2, $3::vector, $4)
     ON CONFLICT (run_id) DO UPDATE
       SET summary_text = EXCLUDED.summary_text,
           embedding    = EXCLUDED.embedding,
           model        = EXCLUDED.model`,
    [input.run_id, input.summary_text, vectorLiteral, input.model],
  );
}

export async function findSimilarRuns(
  pool: Pool,
  embedding: number[],
  limit: number = 3,
  excludeRunId?: string,
): Promise<SimilarRun[]> {
  const vectorLiteral = `[${embedding.join(',')}]`;
  const { rows } = await pool.query<{ run_id: string; summary_text: string; distance: string }>(
    `SELECT run_id, summary_text,
            (embedding <=> $1::vector) AS distance
     FROM run_embedding
     WHERE ($2::text IS NULL OR run_id != $2)
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorLiteral, excludeRunId ?? null, limit],
  );
  return rows.map((r) => ({
    run_id: r.run_id,
    summary_text: r.summary_text,
    distance: parseFloat(r.distance),
  }));
}
