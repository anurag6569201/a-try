import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import { getPool } from '@preview-qa/db';
import { signSession } from '../lib/jwt.js';

const app = new Hono();

const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'] ?? '';
const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET'] ?? '';
const APP_URL = process.env['APP_URL'] ?? 'http://localhost:5173';
const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

app.get('/github', (c) => {
  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${API_URL}/auth/callback`,
    scope: 'read:user read:org',
    state,
  });
  // Store state in a cookie — SameSite=None+Secure so it survives the GitHub redirect
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    sameSite: 'None',
    secure: true,
    maxAge: 600,
    path: '/',
  });
  return c.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

app.get('/callback', async (c) => {
  const { code, state } = c.req.query();
  const storedState = c.req.raw.headers.get('cookie')
    ?.split(';')
    .find((s) => s.trim().startsWith('oauth_state='))
    ?.split('=')[1];

  if (!code || !state || state !== storedState) {
    return c.redirect(`${APP_URL}/login?error=state_mismatch`);
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
  });
  const tokenData = await tokenRes.json() as { access_token?: string; error?: string };

  if (!tokenData.access_token) {
    return c.redirect(`${APP_URL}/login?error=token_exchange_failed`);
  }

  // Fetch GitHub user
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'PreviewQA' },
  });
  const ghUser = await userRes.json() as { id: number; login: string; avatar_url: string };

  // Find installations this GitHub user has access to
  const pool = getPool();
  const { rows: installations } = await pool.query<{ id: string }>(
    `SELECT id FROM installation WHERE github_id IN (
       SELECT DISTINCT github_id FROM installation
       WHERE github_id = $1
     )`,
    [ghUser.id],
  );

  // Also find installations where this user is a collaborator via GitHub App installations
  const installationsRes = await fetch('https://api.github.com/user/installations', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'PreviewQA',
      Accept: 'application/vnd.github+json',
    },
  });
  const installationsData = await installationsRes.json() as { installations?: { id: number }[] };
  const githubInstallationIds = (installationsData.installations ?? []).map((i) => i.id);

  // Match GitHub App installation IDs to our DB installation records
  let installationIds: string[] = installations.map((r) => r.id);
  if (githubInstallationIds.length > 0) {
    const { rows: matched } = await pool.query<{ id: string }>(
      `SELECT id FROM installation WHERE github_id = ANY($1::bigint[])`,
      [githubInstallationIds],
    );
    installationIds = [...new Set([...installationIds, ...matched.map((r) => r.id)])];
  }

  const token = await signSession({
    userId: String(ghUser.id),
    githubId: ghUser.id,
    login: ghUser.login,
    avatarUrl: ghUser.avatar_url,
    installationIds,
  });

  deleteCookie(c, 'oauth_state');

  // Pass token in URL hash — frontend stores it in localStorage and sends as Bearer header.
  // This avoids cross-domain cookie issues (API on azurecontainerapps.io, frontend on azurestaticapps.net).
  return c.redirect(`${APP_URL}/auth/callback#token=${token}`);
});

app.post('/logout', (c) => {
  deleteCookie(c, 'session');
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const { getCookie } = await import('hono/cookie');
  const { verifySession } = await import('../lib/jwt.js');
  const token =
    c.req.header('Authorization')?.replace('Bearer ', '') ??
    getCookie(c, 'session');
  if (!token) return c.json(null);
  const session = await verifySession(token);
  if (!session) return c.json(null);
  return c.json({
    login: session.login,
    avatarUrl: session.avatarUrl,
    installationIds: session.installationIds,
  });
});

export default app;
