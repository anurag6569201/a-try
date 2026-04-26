import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifySession, type SessionPayload } from '../lib/jwt.js';

declare module 'hono' {
  interface ContextVariableMap {
    session: SessionPayload;
  }
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const token = getCookie(c, 'session') ?? c.req.header('Authorization')?.replace('Bearer ', '');
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

  if (!session.installationIds.includes(installationId)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
}
