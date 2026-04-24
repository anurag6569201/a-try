import { Pool } from 'pg';
import { RunState } from '@preview-qa/domain';
import { Run, CreateRunInput, UpdateRunInput } from '../types';

export async function createRun(pool: Pool, input: CreateRunInput): Promise<Run> {
  const { rows } = await pool.query<Run>(
    `INSERT INTO run
       (pull_request_id, repository_id, installation_id, sha, mode, triggered_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.pull_request_id,
      input.repository_id,
      input.installation_id,
      input.sha,
      input.mode,
      input.triggered_by ?? 'push',
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('createRun: no row returned');
  return row;
}

export async function getRunById(pool: Pool, id: string): Promise<Run | null> {
  const { rows } = await pool.query<Run>('SELECT * FROM run WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function getActiveRunsForPR(pool: Pool, pullRequestId: string): Promise<Run[]> {
  const terminalStates: RunState[] = [RunState.Completed, RunState.Failed, RunState.Canceled, RunState.BlockedEnvironment];
  const { rows } = await pool.query<Run>(
    `SELECT * FROM run
     WHERE pull_request_id = $1
       AND state != ALL($2::text[])
     ORDER BY created_at DESC`,
    [pullRequestId, terminalStates],
  );
  return rows;
}

export async function getRunsForPR(pool: Pool, pullRequestId: string): Promise<Run[]> {
  const { rows } = await pool.query<Run>(
    'SELECT * FROM run WHERE pull_request_id = $1 ORDER BY created_at DESC',
    [pullRequestId],
  );
  return rows;
}

export async function updateRun(pool: Pool, id: string, input: UpdateRunInput): Promise<Run> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.state !== undefined) { fields.push(`state = $${idx++}`); values.push(input.state); }
  if (input.preview_url !== undefined) { fields.push(`preview_url = $${idx++}`); values.push(input.preview_url); }
  if (input.github_check_id !== undefined) { fields.push(`github_check_id = $${idx++}`); values.push(input.github_check_id); }
  if (input.started_at !== undefined) { fields.push(`started_at = $${idx++}`); values.push(input.started_at); }
  if (input.completed_at !== undefined) { fields.push(`completed_at = $${idx++}`); values.push(input.completed_at); }

  if (fields.length === 0) {
    const existing = await getRunById(pool, id);
    if (!existing) throw new Error(`updateRun: run ${id} not found`);
    return existing;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query<Run>(
    `UPDATE run SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  const row = rows[0];
  if (!row) throw new Error(`updateRun: run ${id} not found`);
  return row;
}

export async function cancelSupersededRuns(
  pool: Pool,
  pullRequestId: string,
  currentSha: string,
): Promise<number> {
  const activeStates: RunState[] = [
    RunState.Queued,
    RunState.WaitingForPreview,
    RunState.Planning,
    RunState.Running,
    RunState.Analyzing,
    RunState.Reporting,
  ];
  const { rowCount } = await pool.query(
    `UPDATE run
     SET state = $1, updated_at = NOW()
     WHERE pull_request_id = $2
       AND sha != $3
       AND state = ANY($4::text[])`,
    [RunState.Canceled, pullRequestId, currentSha, activeStates],
  );
  return rowCount ?? 0;
}

export async function transitionRunState(
  pool: Pool,
  id: string,
  expectedState: RunState,
  nextState: RunState,
): Promise<Run | null> {
  const { rows } = await pool.query<Run>(
    `UPDATE run
     SET state = $1, updated_at = NOW()
     WHERE id = $2 AND state = $3
     RETURNING *`,
    [nextState, id, expectedState],
  );
  return rows[0] ?? null;
}
