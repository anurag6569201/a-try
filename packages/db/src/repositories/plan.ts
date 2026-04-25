import { Pool } from 'pg';
import { ParseOutcome } from '@preview-qa/domain';
import type { Plan } from '../types';

export interface CreatePlanInput {
  run_id: string;
  parse_outcome: ParseOutcome;
  raw_yaml?: string;
}

export async function createPlan(pool: Pool, input: CreatePlanInput): Promise<Plan> {
  const { rows } = await pool.query<Plan>(
    `INSERT INTO plan (run_id, parse_outcome, raw_yaml)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.run_id, input.parse_outcome, input.raw_yaml ?? null],
  );
  const row = rows[0];
  if (!row) throw new Error('createPlan: no row returned');
  return row;
}

export async function getPlanByRunId(pool: Pool, runId: string): Promise<Plan | null> {
  const { rows } = await pool.query<Plan>('SELECT * FROM plan WHERE run_id = $1', [runId]);
  return rows[0] ?? null;
}
