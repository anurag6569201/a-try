import { Pool } from 'pg';

export interface TestCase {
  id: string;
  plan_id: string;
  run_id: string;
  name: string;
  steps: unknown[];
  order: number;
  created_at: Date;
}

export interface CreateTestCaseInput {
  plan_id: string;
  run_id: string;
  name: string;
  steps: unknown[];
  order: number;
}

export async function createTestCase(pool: Pool, input: CreateTestCaseInput): Promise<TestCase> {
  const { rows } = await pool.query<TestCase>(
    `INSERT INTO test_case (plan_id, run_id, name, steps, "order")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.plan_id, input.run_id, input.name, JSON.stringify(input.steps), input.order],
  );
  const row = rows[0];
  if (!row) throw new Error('createTestCase: no row returned');
  return row;
}

export async function getTestCasesByPlanId(pool: Pool, planId: string): Promise<TestCase[]> {
  const { rows } = await pool.query<TestCase>(
    'SELECT * FROM test_case WHERE plan_id = $1 ORDER BY "order" ASC',
    [planId],
  );
  return rows;
}
