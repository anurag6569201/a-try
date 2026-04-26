import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { getPool } from '@preview-qa/db';
import { verifySession, type SessionPayload } from '../lib/jwt.js';

declare module 'hono' {
  interface ContextVariableMap {
    session: SessionPayload;
  }
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const token =
    c.req.query('token') ??
    c.req.header('Authorization')?.replace('Bearer ', '') ??
    getCookie(c, 'session');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const session = await verifySession(token);
  if (!session) return c.json({ error: 'Invalid or expired session' }, 401);

  c.set('session', session);
  await next();
}

export async function requireInstallationAccess(c: Context, next: Next): Promise<Response | void> {
  const session = c.get('session');
  const installationId = c.req.param('installationId');
  if (!installationId) return c.json({ error: 'Missing installationId' }, 400);

  // Check JWT cache first, then fall back to DB lookup by github_id ownership
  if (session.installationIds.includes(installationId)) {
    await next();
    return;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id FROM installation WHERE id = $1 AND github_id = $2`,
    [installationId, session.githubId],
  );
  if (rows.length === 0) return c.json({ error: 'Forbidden' }, 403);

  await next();
}
