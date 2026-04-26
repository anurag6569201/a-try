import { Hono } from 'hono';
import { getPool } from '@preview-qa/db';
import { requireAuth, requireInstallationAccess } from '../middleware/auth.js';

// Mounted at /api/installations
export const installationReviewRoutes = new Hono();

installationReviewRoutes.use('/:installationId/*', requireAuth, requireInstallationAccess);

// GET /api/installations/:installationId/repos/:repoId/pull-requests/:prId/review
installationReviewRoutes.get('/:installationId/repos/:repoId/pull-requests/:prId/review', async (c) => {
  const pool = getPool();
  const prId = c.req.param('prId');

  const { rows } = await pool.query(
    `SELECT rr.id, rr.pull_request_id, rr.score, rr.risk_level, rr.agents_run,
            rr.findings_count, rr.github_comment_id, rr.github_review_id,
            rr.created_at, rr.updated_at
     FROM review_record rr
     WHERE rr.pull_request_id = $1
     ORDER BY rr.created_at DESC
     LIMIT 1`,
    [prId],
  );

  if (rows.length === 0) return c.json(null);
  return c.json(rows[0]);
});

// Mounted at /api
export const reviewRoutes = new Hono();

reviewRoutes.use('/reviews/*', requireAuth);

// GET /api/reviews/:reviewId/findings
reviewRoutes.get('/reviews/:reviewId/findings', async (c) => {
  const pool = getPool();
  const reviewId = c.req.param('reviewId');

  const { rows } = await pool.query(
    `SELECT id, review_id, agent, severity, file, line, title, body, suggestion, confidence, created_at
     FROM review_finding
     WHERE review_id = $1
     ORDER BY
       CASE severity WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       created_at`,
    [reviewId],
  );

  return c.json(rows);
});
