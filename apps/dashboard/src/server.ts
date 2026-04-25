import { getPool } from '@preview-qa/db';
import { createApp } from './app.js';

const pool = getPool();
const app = createApp(pool);
const port = parseInt(process.env['PORT'] ?? '3001', 10);

app.listen(port, () => {
  process.stdout.write(`Dashboard listening on http://localhost:${port}\n`);
});
