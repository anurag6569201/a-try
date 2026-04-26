import { Hono } from 'hono';
import { getPool, getInstallationById, countRunsForInstallationSince } from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';
import { TIER_LIMITS } from '../lib/tiers.js';
import type { BillingTier } from '@preview-qa/domain';

const app = new Hono();

// GET /installations — list all installations the session user has access to.
// Queries DB by GitHub installation IDs the user has access to (via GitHub API
// at login time) AND by direct account ownership (github_id match). This means
// installations created after the JWT was issued are still visible.
app.get('/', requireAuth, async (c) => {
  const session = c.get('session');
  const pool = getPool();

  // Union: installations the JWT knows about + installations owned by this GitHub user
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (id) * FROM installation
     WHERE id = ANY($1::text[])
        OR github_id = ANY($2::bigint[])
     ORDER BY id, account_login ASC`,
    [
      session.installationIds.length ? session.installationIds : [''],
      // githubId is the user's personal GitHub ID — matches installations they own
      [session.githubId],
    ],
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
