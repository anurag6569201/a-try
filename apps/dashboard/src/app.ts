import express from 'express';
import type { Pool } from 'pg';
import { installationsRouter } from './routes/installations.js';
import { reposRouter } from './routes/repos.js';

export function createApp(pool: Pool): express.Application {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  app.use('/installations', installationsRouter(pool));
  app.use('/installations/:installationId/repos', reposRouter(pool));
  app.get('/', (_req, res) => res.redirect('/installations'));
  return app;
}
