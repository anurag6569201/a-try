import { Pool } from 'pg';
import type { PullRequest } from '../types';

export async function getPullRequestByRepoAndNumber(
  pool: Pool,
  repositoryId: string,
  githubNumber: number,
): Promise<PullRequest | null> {
  const { rows } = await pool.query<PullRequest>(
    'SELECT * FROM pull_request WHERE repository_id = $1 AND github_number = $2',
    [repositoryId, githubNumber],
  );
  return rows[0] ?? null;
}

export async function getLatestRunForPR(
  pool: Pool,
  pullRequestId: string,
): Promise<import('../types').Run | null> {
  const { rows } = await pool.query<import('../types').Run>(
    'SELECT * FROM run WHERE pull_request_id = $1 ORDER BY created_at DESC LIMIT 1',
    [pullRequestId],
  );
  return rows[0] ?? null;
}
