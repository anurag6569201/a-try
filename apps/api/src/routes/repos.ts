import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  getPool,
  getRepositoriesForInstallation,
  getRepositoryById,
  updateRepositoryConfig,
} from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';

const app = new Hono();

// All repo routes are scoped under /installations/:installationId
app.use('/:installationId/*', requireAuth, requireInstallationAccess);

// GET /installations/:installationId/repos
app.get('/:installationId/repos', async (c) => {
  const pool = getPool();
  const repos = await getRepositoriesForInstallation(pool, c.req.param('installationId'));
  return c.json(repos);
});

// GET /installations/:installationId/repos/:repoId
app.get('/:installationId/repos/:repoId', async (c) => {
  const pool = getPool();
  const repo = await getRepositoryById(pool, c.req.param('repoId'));
  if (!repo || repo.installation_id !== c.req.param('installationId')) {
    return c.json({ error: 'Not found' }, 404);
  }
  return c.json(repo);
});

// POST /installations/:installationId/repos/:repoId/config
const configSchema = z.object({ config: z.record(z.unknown()) });

app.post(
  '/:installationId/repos/:repoId/config',
  zValidator('json', configSchema),
  async (c) => {
    const pool = getPool();
    const { config } = c.req.valid('json');
    const repo = await getRepositoryById(pool, c.req.param('repoId'));
    if (!repo || repo.installation_id !== c.req.param('installationId')) {
      return c.json({ error: 'Not found' }, 404);
    }
    const updated = await updateRepositoryConfig(pool, repo.id, config);
    return c.json(updated);
  },
);

export default app;
