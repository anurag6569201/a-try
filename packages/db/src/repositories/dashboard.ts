import type { Pool } from 'pg';
import type { Repository, Run, Result, Artifact, ModelTrace } from '../types.js';

export async function getRepositoriesForInstallation(
  pool: Pool,
  installationId: string,
): Promise<Repository[]> {
  const { rows } = await pool.query<Repository>(
    'SELECT * FROM repository WHERE installation_id = $1 ORDER BY full_name ASC',
    [installationId],
  );
  return rows;
}

export async function getRepositoryById(
  pool: Pool,
  id: string,
): Promise<Repository | null> {
  const { rows } = await pool.query<Repository>(
    'SELECT * FROM repository WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function updateRepositoryConfig(
  pool: Pool,
  id: string,
  config: Record<string, unknown>,
): Promise<Repository | null> {
  const { rows } = await pool.query<Repository>(
    `UPDATE repository SET config = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [JSON.stringify(config), id],
  );
  return rows[0] ?? null;
}

export async function getRunsForRepository(
  pool: Pool,
  repositoryId: string,
  limit = 20,
): Promise<Run[]> {
  const { rows } = await pool.query<Run>(
    'SELECT * FROM run WHERE repository_id = $1 ORDER BY created_at DESC LIMIT $2',
    [repositoryId, limit],
  );
  return rows;
}

export async function getResultsForRun(
  pool: Pool,
  runId: string,
): Promise<Result[]> {
  const { rows } = await pool.query<Result>(
    'SELECT * FROM result WHERE run_id = $1 ORDER BY created_at ASC',
    [runId],
  );
  return rows;
}

export async function getArtifactsForRun(
  pool: Pool,
  runId: string,
): Promise<Artifact[]> {
  const { rows } = await pool.query<Artifact>(
    'SELECT * FROM artifact WHERE run_id = $1 ORDER BY created_at ASC',
    [runId],
  );
  return rows;
}

export async function getModelTracesForRun(
  pool: Pool,
  runId: string,
): Promise<ModelTrace[]> {
  const { rows } = await pool.query<ModelTrace>(
    'SELECT * FROM model_trace WHERE run_id = $1 ORDER BY created_at ASC',
    [runId],
  );
  return rows;
}

export async function countRunsForInstallationInMonth(
  pool: Pool,
  installationId: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM run
     WHERE installation_id = $1
       AND created_at >= date_trunc('month', NOW())`,
    [installationId],
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}
