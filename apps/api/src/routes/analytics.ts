import { Hono } from 'hono';
import { getPool } from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';

const app = new Hono();

app.use('/:installationId/*', requireAuth, requireInstallationAccess);

// GET /installations/:installationId/analytics
// Returns: runs per day (30d), pass rate, mode breakdown, avg duration, failure categories
app.get('/:installationId/analytics', async (c) => {
  const pool = getPool();
  const id = c.req.param('installationId')!;
  const days = Math.min(parseInt(c.req.query('days') ?? '30', 10), 90);

  const [runsPerDay, modeBreakdown, outcomeBreakdown, failureCategories, avgDuration, activeRepos] =
    await Promise.all([
      // Runs per day bucketed
      pool.query<{ day: string; count: string; passed: string; failed: string }>(
        `SELECT
           date_trunc('day', r.created_at)::date::text AS day,
           COUNT(*)::text AS count,
           COUNT(*) FILTER (WHERE r.state = 'completed')::text AS passed,
           COUNT(*) FILTER (WHERE r.state = 'failed')::text AS failed
         FROM run r
         WHERE r.installation_id = $1
           AND r.created_at >= NOW() - ($2 || ' days')::interval
         GROUP BY 1
         ORDER BY 1 ASC`,
        [id, days],
      ),

      // Mode breakdown
      pool.query<{ mode: string; count: string }>(
        `SELECT mode, COUNT(*)::text AS count
         FROM run
         WHERE installation_id = $1
           AND created_at >= NOW() - ($2 || ' days')::interval
         GROUP BY mode`,
        [id, days],
      ),

      // Overall outcome breakdown
      pool.query<{ state: string; count: string }>(
        `SELECT state, COUNT(*)::text AS count
         FROM run
         WHERE installation_id = $1
           AND created_at >= NOW() - ($2 || ' days')::interval
         GROUP BY state`,
        [id, days],
      ),

      // Top failure categories
      pool.query<{ failure_category: string; count: string }>(
        `SELECT res.failure_category, COUNT(*)::text AS count
         FROM result res
         JOIN run r ON r.id = res.run_id
         WHERE r.installation_id = $1
           AND r.created_at >= NOW() - ($2 || ' days')::interval
           AND res.failure_category IS NOT NULL
         GROUP BY res.failure_category
         ORDER BY count DESC`,
        [id, days],
      ),

      // Avg run duration (ms) for completed runs
      pool.query<{ avg_ms: string }>(
        `SELECT AVG(
           EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
         )::text AS avg_ms
         FROM run
         WHERE installation_id = $1
           AND state = 'completed'
           AND started_at IS NOT NULL
           AND completed_at IS NOT NULL
           AND created_at >= NOW() - ($2 || ' days')::interval`,
        [id, days],
      ),

      // Active repos count
      pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT repository_id)::text AS count
         FROM run
         WHERE installation_id = $1
           AND created_at >= NOW() - ($2 || ' days')::interval`,
        [id, days],
      ),
    ]);

  const totalRuns = runsPerDay.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
  const totalPassed = runsPerDay.rows.reduce((s, r) => s + parseInt(r.passed, 10), 0);

  return c.json({
    period_days: days,
    total_runs: totalRuns,
    pass_rate: totalRuns > 0 ? Math.round((totalPassed / totalRuns) * 100) : 0,
    avg_duration_ms: parseFloat(avgDuration.rows[0]?.avg_ms ?? '0') || 0,
    active_repos: parseInt(activeRepos.rows[0]?.count ?? '0', 10),
    runs_per_day: runsPerDay.rows.map((r) => ({
      day: r.day,
      count: parseInt(r.count, 10),
      passed: parseInt(r.passed, 10),
      failed: parseInt(r.failed, 10),
    })),
    mode_breakdown: Object.fromEntries(
      modeBreakdown.rows.map((r) => [r.mode, parseInt(r.count, 10)]),
    ),
    outcome_breakdown: Object.fromEntries(
      outcomeBreakdown.rows.map((r) => [r.state, parseInt(r.count, 10)]),
    ),
    failure_categories: failureCategories.rows.map((r) => ({
      category: r.failure_category,
      count: parseInt(r.count, 10),
    })),
  });
});

// GET /installations/:installationId/repos/:repoId/analytics
app.get('/:installationId/repos/:repoId/analytics', async (c) => {
  const pool = getPool();
  const id = c.req.param('installationId')!;
  const repoId = c.req.param('repoId')!;
  const days = Math.min(parseInt(c.req.query('days') ?? '30', 10), 90);

  const { rows: repo } = await pool.query(
    `SELECT id FROM repository WHERE id = $1 AND installation_id = $2`,
    [repoId, id],
  );
  if (!repo[0]) return c.json({ error: 'Not found' }, 404);

  const [runsPerDay, stateBreakdown, failureCategories] = await Promise.all([
    pool.query<{ day: string; count: string; passed: string; failed: string }>(
      `SELECT
         date_trunc('day', created_at)::date::text AS day,
         COUNT(*)::text AS count,
         COUNT(*) FILTER (WHERE state = 'completed')::text AS passed,
         COUNT(*) FILTER (WHERE state = 'failed')::text AS failed
       FROM run
       WHERE repository_id = $1
         AND created_at >= NOW() - ($2 || ' days')::interval
       GROUP BY 1 ORDER BY 1 ASC`,
      [repoId, days],
    ),

    pool.query<{ state: string; count: string }>(
      `SELECT state, COUNT(*)::text AS count FROM run
       WHERE repository_id = $1
         AND created_at >= NOW() - ($2 || ' days')::interval
       GROUP BY state`,
      [repoId, days],
    ),

    pool.query<{ failure_category: string; count: string }>(
      `SELECT res.failure_category, COUNT(*)::text AS count
       FROM result res JOIN run r ON r.id = res.run_id
       WHERE r.repository_id = $1
         AND r.created_at >= NOW() - ($2 || ' days')::interval
         AND res.failure_category IS NOT NULL
       GROUP BY res.failure_category ORDER BY count DESC`,
      [repoId, days],
    ),
  ]);

  const totalRuns = runsPerDay.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
  const totalPassed = runsPerDay.rows.reduce((s, r) => s + parseInt(r.passed, 10), 0);

  return c.json({
    period_days: days,
    total_runs: totalRuns,
    pass_rate: totalRuns > 0 ? Math.round((totalPassed / totalRuns) * 100) : 0,
    runs_per_day: runsPerDay.rows.map((r) => ({
      day: r.day,
      count: parseInt(r.count, 10),
      passed: parseInt(r.passed, 10),
      failed: parseInt(r.failed, 10),
    })),
    state_breakdown: Object.fromEntries(
      stateBreakdown.rows.map((r) => [r.state, parseInt(r.count, 10)]),
    ),
    failure_categories: failureCategories.rows.map((r) => ({
      category: r.failure_category,
      count: parseInt(r.count, 10),
    })),
  });
});

export default app;
