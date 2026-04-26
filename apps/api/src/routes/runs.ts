import { Hono } from 'hono';
import {
  getPool,
  getRunById,
  getResultsForRun,
  getArtifactsForRun,
  getModelTracesForRun,
  getRepositoryById,
  type Run,
} from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';

const app = new Hono();

app.use('/:installationId/*', requireAuth, requireInstallationAccess);

// GET /installations/:installationId/repos/:repoId/runs
// Query params: limit (default 50, max 200), cursor (run id), state, mode, since, until
app.get('/:installationId/repos/:repoId/runs', async (c) => {
  const pool = getPool();
  const repo = await getRepositoryById(pool, c.req.param('repoId'));
  if (!repo || repo.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }

  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);
  const cursor = c.req.query('cursor');
  const state = c.req.query('state');
  const mode = c.req.query('mode');
  const since = c.req.query('since');
  const until = c.req.query('until');

  const conditions: string[] = ['r.repository_id = $1'];
  const params: unknown[] = [repo.id];
  let idx = 2;

  if (cursor) {
    conditions.push(`r.created_at < (SELECT created_at FROM run WHERE id = $${idx++})`);
    params.push(cursor);
  }
  if (state) { conditions.push(`r.state = $${idx++}`); params.push(state); }
  if (mode)  { conditions.push(`r.mode = $${idx++}`);  params.push(mode); }
  if (since) { conditions.push(`r.created_at >= $${idx++}`); params.push(new Date(since)); }
  if (until) { conditions.push(`r.created_at <= $${idx++}`); params.push(new Date(until)); }

  params.push(limit + 1); // fetch one extra to determine hasMore
  const { rows } = await pool.query<Run>(
    `SELECT r.* FROM run r
     WHERE ${conditions.join(' AND ')}
     ORDER BY r.created_at DESC
     LIMIT $${idx}`,
    params,
  );

  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (data[data.length - 1]?.id ?? null) : null;

  return c.json({ data, nextCursor, hasMore });
});

// GET /installations/:installationId/repos/:repoId/runs/:runId
app.get('/:installationId/repos/:repoId/runs/:runId', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(run);
});

// GET .../runs/:runId/results
app.get('/:installationId/repos/:repoId/runs/:runId/results', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(await getResultsForRun(pool, run.id));
});

// GET .../runs/:runId/artifacts
app.get('/:installationId/repos/:repoId/runs/:runId/artifacts', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(await getArtifactsForRun(pool, run.id));
});

// GET .../runs/:runId/traces
app.get('/:installationId/repos/:repoId/runs/:runId/traces', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(await getModelTracesForRun(pool, run.id));
});

export default app;
