'use strict';
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  // Upsert installation from webhook payload
  await client.query(`
    INSERT INTO installation (github_id, account_login, account_type, tier)
    VALUES (127162925, 'anurag6569201', 'User', 'free')
    ON CONFLICT (github_id) DO UPDATE
      SET account_login = EXCLUDED.account_login,
          updated_at    = NOW()
  `);

  const { rows: [inst] } = await client.query(
    `SELECT id FROM installation WHERE github_id = 127162925`
  );
  console.log('Installation ID:', inst.id);

  // Upsert repository
  await client.query(`
    INSERT INTO repository (installation_id, github_id, full_name, default_branch)
    VALUES ($1, 1220274085, 'anurag6569201/a-try', 'main')
    ON CONFLICT (github_id) DO UPDATE
      SET full_name  = EXCLUDED.full_name,
          updated_at = NOW()
  `, [inst.id]);

  const { rows: [repo] } = await client.query(
    `SELECT id FROM repository WHERE github_id = 1220274085`
  );
  console.log('Repository ID:', repo.id);

  await client.end();
  console.log('Seeded successfully.');
}

main().catch(e => { console.error(e); process.exit(1); });
