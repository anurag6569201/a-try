import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { getPool, getRunById } from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';
import { RunState } from '@preview-qa/domain';

const app = new Hono();

const TERMINAL: string[] = [
  RunState.Completed,
  RunState.Failed,
  RunState.Canceled,
  RunState.BlockedEnvironment,
];

// GET /installations/:installationId/repos/:repoId/runs/:runId/stream
// Server-Sent Events: emits run state on change until terminal state reached
app.get(
  '/:installationId/repos/:repoId/runs/:runId/stream',
  requireAuth,
  requireInstallationAccess,
  (c) => {
    const runId = c.req.param('runId') ?? '';
    const installationId = c.req.param('installationId') ?? '';
    const pool = getPool();

    return streamSSE(c, async (stream) => {
      let lastState: string = '';
      let ticks = 0;
      const MAX_TICKS = 120; // 10 min at 5s interval

      while (ticks < MAX_TICKS) {
        const run = await getRunById(pool, runId);

        if (!run || run.installation_id !== installationId) {
          await stream.writeSSE({ event: 'error', data: 'not_found' });
          break;
        }

        if ((run.state as string) !== lastState) {
          lastState = run.state as string;
          await stream.writeSSE({
            event: 'run',
            data: JSON.stringify(run),
            id: String(ticks),
          });
        }

        if (TERMINAL.includes(run.state)) {
          await stream.writeSSE({ event: 'done', data: run.state });
          break;
        }

        await stream.sleep(5000);
        ticks++;
      }
    });
  },
);

// GET /installations/:installationId/repos/:repoId/runs/stream
// Streams new runs appearing for a repo (for live run list updates)
app.get(
  '/:installationId/repos/:repoId/runs/stream',
  requireAuth,
  requireInstallationAccess,
  (c) => {
    const repoId = c.req.param('repoId');
    const installationId = c.req.param('installationId');
    const pool = getPool();

    return streamSSE(c, async (stream) => {
      let lastCount = 0;
      let ticks = 0;
      const MAX_TICKS = 180; // 15 min

      while (ticks < MAX_TICKS) {
        const { rows } = await pool.query<{ id: string; state: string; created_at: Date }>(
          `SELECT id, state, created_at FROM run
           WHERE repository_id = (SELECT id FROM repository WHERE id = $1 AND installation_id = $2)
           ORDER BY created_at DESC LIMIT 50`,
          [repoId, installationId],
        );

        if (rows.length !== lastCount) {
          lastCount = rows.length;
          await stream.writeSSE({
            event: 'runs',
            data: JSON.stringify(rows),
            id: String(ticks),
          });
        }

        await stream.sleep(5000);
        ticks++;
      }
    });
  },
);

export default app;
