import type { Pool } from 'pg';
import type { Installation, BillingEvent, UpsertBillingEventInput } from '../types.js';

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

export async function getInstallationByStripeCustomerId(
  pool: Pool,
  stripeCustomerId: string,
): Promise<Installation | null> {
  const { rows } = await pool.query<Installation>(
    'SELECT * FROM installation WHERE stripe_customer_id = $1',
    [stripeCustomerId],
  );
  return rows[0] ?? null;
}

export interface UpdateInstallationBillingInput {
  tier?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  billingCycleAnchor?: Date | null;
  gracePeriodEndsAt?: Date | null;
}

export async function updateInstallationBilling(
  pool: Pool,
  id: string,
  input: UpdateInstallationBillingInput,
): Promise<Installation | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.tier !== undefined) { fields.push(`tier = $${idx++}`); values.push(input.tier); }
  if (input.stripeCustomerId !== undefined) { fields.push(`stripe_customer_id = $${idx++}`); values.push(input.stripeCustomerId); }
  if (input.stripeSubscriptionId !== undefined) { fields.push(`stripe_subscription_id = $${idx++}`); values.push(input.stripeSubscriptionId); }
  if (input.billingCycleAnchor !== undefined) { fields.push(`billing_cycle_anchor = $${idx++}`); values.push(input.billingCycleAnchor); }
  if (input.gracePeriodEndsAt !== undefined) { fields.push(`grace_period_ends_at = $${idx++}`); values.push(input.gracePeriodEndsAt); }

  if (fields.length === 0) return getInstallationById(pool, id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query<Installation>(
    `UPDATE installation SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rows[0] ?? null;
}

export async function recordBillingEvent(
  pool: Pool,
  input: UpsertBillingEventInput,
): Promise<void> {
  await pool.query(
    `INSERT INTO billing_event (installation_id, stripe_event_id, event_type, payload)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (stripe_event_id) DO NOTHING`,
    [input.installationId, input.stripeEventId, input.eventType, JSON.stringify(input.payload)],
  );
}

export async function isBillingEventProcessed(
  pool: Pool,
  stripeEventId: string,
): Promise<boolean> {
  const { rows } = await pool.query<BillingEvent>(
    'SELECT id FROM billing_event WHERE stripe_event_id = $1',
    [stripeEventId],
  );
  return rows.length > 0;
}
