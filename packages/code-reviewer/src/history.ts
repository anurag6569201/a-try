import type { Pool } from 'pg';
import type { AzureOpenAI } from 'openai';
import { embedText } from '@preview-qa/ai';
import type { Finding, GroundedFinding } from './types.js';

const SIMILARITY_SUPPRESS = 0.97;  // suppress if nearly identical dismissed finding exists
const SIMILARITY_NOTE = 0.88;      // add a note if similar dismissed finding exists
const SIMILARITY_BOOST = 0.88;     // boost confidence if similar accepted finding exists

/**
 * Embeds each finding and queries pgvector for similar past findings.
 * Suppresses findings that match previously dismissed ones.
 * Adds notes or boosts confidence based on history.
 */
export async function groundInHistory(
  pool: Pool,
  client: AzureOpenAI,
  embeddingDeployment: string,
  findings: Finding[],
): Promise<GroundedFinding[]> {
  const grounded: GroundedFinding[] = [];

  for (const finding of findings) {
    const text = `${finding.title}: ${finding.body}`;

    let embedding: number[];
    try {
      embedding = await embedText(client, embeddingDeployment, text);
    } catch {
      grounded.push({ ...finding, suppressedByHistory: false, historyNote: undefined });
      continue;
    }

    // Store embedding for this finding (done separately after review is saved to DB)
    // Here we just query for similar past findings
    const { rows } = await pool.query<{
      title: string;
      status: string;
      similarity: number;
    }>(
      `SELECT title, status, 1 - (embedding <=> $1::vector) AS similarity
       FROM review_finding
       WHERE status IN ('dismissed', 'accepted')
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      [`[${embedding.join(',')}]`],
    );

    let suppressedByHistory = false;
    let historyNote: string | undefined;
    let boostedConfidence = finding.confidence;

    for (const row of rows) {
      if (row.similarity >= SIMILARITY_SUPPRESS && row.status === 'dismissed') {
        suppressedByHistory = true;
        historyNote = `Previously dismissed finding with similar title: "${row.title}"`;
        break;
      }
      if (row.similarity >= SIMILARITY_NOTE && row.status === 'dismissed') {
        historyNote = `Note: a similar finding ("${row.title}") was previously dismissed — verify this still applies.`;
      }
      if (row.similarity >= SIMILARITY_BOOST && row.status === 'accepted') {
        boostedConfidence = finding.confidence === 'low' ? 'medium' : finding.confidence === 'medium' ? 'high' : 'high';
        historyNote = `Confidence boosted: similar finding ("${row.title}") was previously accepted as valid.`;
      }
    }

    grounded.push({
      ...finding,
      confidence: boostedConfidence,
      suppressedByHistory,
      historyNote,
    });
  }

  return grounded.filter((f) => !f.suppressedByHistory);
}

/** Saves finding embeddings to the DB after the review_finding rows are inserted. */
export async function saveFindingEmbeddings(
  pool: Pool,
  client: AzureOpenAI,
  embeddingDeployment: string,
  reviewId: string,
  findings: Finding[],
): Promise<void> {
  for (const finding of findings) {
    const text = `${finding.title}: ${finding.body}`;
    try {
      const embedding = await embedText(client, embeddingDeployment, text);
      await pool.query(
        `UPDATE review_finding SET embedding = $1::vector
         WHERE review_id = $2 AND title = $3 AND agent = $4`,
        [`[${embedding.join(',')}]`, reviewId, finding.title, finding.agent],
      );
    } catch {
      // Non-fatal: skip if embedding fails for one finding
    }
  }
}
