import { Hono } from 'hono';
import {
  getPool,
  getRunById,
  getRunsForRepository,
  getResultsForRun,
  getArtifactsForRun,
  getModelTracesForRun,
  getRepositoryById,
} from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';

const app = new Hono();

app.use('/:installationId/*', requireAuth, requireInstallationAccess);

// GET /installations/:installationId/repos/:repoId/runs
app.get('/:installationId/repos/:repoId/runs', async (c) => {
  const pool = getPool();
  const repo = await getRepositoryById(pool, c.req.param('repoId'));
  if (!repo || repo.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);
  const runs = await getRunsForRepository(pool, repo.id, limit);
  return c.json(runs);
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

// GET /installations/:installationId/repos/:repoId/runs/:runId/results
app.get('/:installationId/repos/:repoId/runs/:runId/results', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const results = await getResultsForRun(pool, run.id);
  return c.json(results);
});

// GET /installations/:installationId/repos/:repoId/runs/:runId/artifacts
app.get('/:installationId/repos/:repoId/runs/:runId/artifacts', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const artifacts = await getArtifactsForRun(pool, run.id);
  return c.json(artifacts);
});

// GET /installations/:installationId/repos/:repoId/runs/:runId/traces
app.get('/:installationId/repos/:repoId/runs/:runId/traces', async (c) => {
  const pool = getPool();
  const run = await getRunById(pool, c.req.param('runId'));
  if (!run || run.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  const traces = await getModelTracesForRun(pool, run.id);
  return c.json(traces);
});

export default app;
