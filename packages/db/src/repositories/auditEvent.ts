import { Pool } from 'pg';
import type { AuditEvent, CreateAuditEventInput } from '../types';

export async function createAuditEvent(
  pool: Pool,
  input: CreateAuditEventInput,
): Promise<AuditEvent> {
  const { rows } = await pool.query<AuditEvent>(
    `INSERT INTO audit_event
       (installation_id, run_id, event_type, actor, payload)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.installation_id ?? null,
      input.run_id ?? null,
      input.event_type,
      input.actor ?? null,
      JSON.stringify(input.payload ?? {}),
    ],
  );
  const row = rows[0];
  if (!row) throw new Error('createAuditEvent: no row returned');
  return row;
}
