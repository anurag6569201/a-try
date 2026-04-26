import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

import authRoutes from './routes/auth.js';
import installationRoutes from './routes/installations.js';
import repoRoutes from './routes/repos.js';
import runRoutes from './routes/runs.js';

const app = new Hono();

const APP_URL = process.env['APP_URL'] ?? 'http://localhost:5173';

app.use('*', cors({
  origin: [APP_URL, 'http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));

app.route('/auth', authRoutes);
app.route('/api/installations', installationRoutes);
app.route('/api/installations', repoRoutes);
app.route('/api/installations', runRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));

const port = parseInt(process.env['PORT'] ?? '3001', 10);
console.log(`API server listening on port ${port}`);

serve({ fetch: app.fetch, port });
