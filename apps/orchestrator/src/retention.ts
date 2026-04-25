import { getPool, closePool, deleteOldRuns, deleteOldAuditEvents } from '@preview-qa/db';
import { createLogger } from '@preview-qa/observability';

const RUN_RETENTION_DAYS = Number(process.env['RUN_RETENTION_DAYS'] ?? '90');
const AUDIT_RETENTION_DAYS = Number(process.env['AUDIT_RETENTION_DAYS'] ?? '90');

async function main(): Promise<void> {
  if (!process.env['DATABASE_URL']) throw new Error('Missing DATABASE_URL');

  const log = createLogger('retention');
  const pool = getPool();

  try {
    const deletedRuns = await deleteOldRuns(pool, RUN_RETENTION_DAYS);
    log.info({ deletedRuns, olderThanDays: RUN_RETENTION_DAYS }, 'purged old runs');

    const deletedAuditEvents = await deleteOldAuditEvents(pool, AUDIT_RETENTION_DAYS);
    log.info({ deletedAuditEvents, olderThanDays: AUDIT_RETENTION_DAYS }, 'purged old audit events');
  } finally {
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error('Retention job failed:', err);
  process.exit(1);
});
