// One-shot migration runner
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

const { Client } = await import('/app/node_modules/pg/lib/index.js');

const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL not set'); process.exit(1); }

const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });

const migrationsDir = '/app/packages/db/migrations';
const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

await client.connect();
console.log('Connected.');

for (const f of files) {
  const sql = readFileSync(path.join(migrationsDir, f), 'utf8');
  console.log(`Running ${f}...`);
  try {
    await client.query(sql);
    console.log('  OK');
  } catch (e) {
    if (['42P07','42710','42P06'].includes(e.code) || e.message.includes('already exists')) {
      console.log('  already exists, skipping');
    } else {
      console.error(`  ERROR: ${e.message}`);
    }
  }
}

await client.end();
console.log('All migrations complete.');
