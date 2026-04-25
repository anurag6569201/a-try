import type { Pool } from 'pg';
import type { Installation } from '../types.js';

export async function getInstallationById(pool: Pool, id: string): Promise<Installation | null> {
  const { rows } = await pool.query<Installation>('SELECT * FROM installation WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getInstallationByGithubId(pool: Pool, githubId: number): Promise<Installation | null> {
  const { rows } = await pool.query<Installation>('SELECT * FROM installation WHERE github_id = $1', [githubId]);
  return rows[0] ?? null;
}

export async function countRunsForInstallationSince(
  pool: Pool,
  installationId: string,
  since: Date,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM run
     WHERE installation_id = $1
       AND created_at >= $2`,
    [installationId, since],
  );
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function updateInstallationTier(
  pool: Pool,
  id: string,
  tier: string,
): Promise<Installation | null> {
  const { rows } = await pool.query<Installation>(
    `UPDATE installation SET tier = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [tier, id],
  );
  return rows[0] ?? null;
}
