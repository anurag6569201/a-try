import { Hono } from 'hono';
import { getPool, getInstallationById, countRunsForInstallationSince } from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';
import { TIER_LIMITS } from '../lib/tiers.js';
import type { BillingTier } from '@preview-qa/domain';

const app = new Hono();

// GET /installations — list all installations the session user has access to
app.get('/', requireAuth, async (c) => {
  const session = c.get('session');
  if (session.installationIds.length === 0) return c.json([]);

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM installation WHERE id = ANY($1::text[]) ORDER BY account_login ASC`,
    [session.installationIds],
  );
  return c.json(rows);
});

// GET /installations/:installationId
app.get('/:installationId', requireAuth, requireInstallationAccess, async (c) => {
  const pool = getPool();
  const installation = await getInstallationById(pool, c.req.param('installationId')!);
  if (!installation) return c.json({ error: 'Not found' }, 404);
  return c.json(installation);
});

// GET /installations/:installationId/usage
app.get('/:installationId/usage', requireAuth, requireInstallationAccess, async (c) => {
  const pool = getPool();
  const id = c.req.param('installationId')!;

  const installation = await getInstallationById(pool, id);
  if (!installation) return c.json({ error: 'Not found' }, 404);

  const billingAnchor = installation.billing_cycle_anchor
    ? new Date(installation.billing_cycle_anchor)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [monthlyRuns, repoResult] = await Promise.all([
    countRunsForInstallationSince(pool, id!, billingAnchor),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM repository WHERE installation_id = $1`,
      [id],
    ),
  ]);

  const activeRepos = parseInt(repoResult.rows[0]?.count ?? '0', 10);
  const limits = TIER_LIMITS[installation.tier as BillingTier];
  return c.json({ monthly_runs: monthlyRuns, active_repos: activeRepos, limits });
});

export default app;
