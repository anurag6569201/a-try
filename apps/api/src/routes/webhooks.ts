import { Hono } from 'hono';
import { getPool } from '@preview-qa/db';
import { ServiceBusClient } from '@azure/service-bus';
import { EventType } from '@preview-qa/domain';
import type { ServiceBusEnvelope } from '@preview-qa/schemas';
import { randomUUID } from 'crypto';

const app = new Hono();

const WEBHOOK_SECRET = process.env['GITHUB_WEBHOOK_SECRET'] ?? '';
const SB_CONNECTION_STRING = process.env['AZURE_SERVICE_BUS_CONNECTION_STRING'] ?? '';
const SB_QUEUE_NAME = process.env['AZURE_SERVICE_BUS_QUEUE_NAME'] ?? 'run-jobs';

async function enqueueEvent(envelope: ServiceBusEnvelope): Promise<void> {
  if (!SB_CONNECTION_STRING) return;
  const client = new ServiceBusClient(SB_CONNECTION_STRING);
  const sender = client.createSender(SB_QUEUE_NAME);
  try {
    await sender.sendMessages({ body: envelope, messageId: envelope.messageId });
  } finally {
    await sender.close();
    await client.close();
  }
}

async function verifySignature(body: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expected = 'sha256=' + Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return expected === signature;
}

app.post('/github', async (c) => {
  const body = await c.req.text();
  const sig = c.req.header('x-hub-signature-256') ?? '';
  const event = c.req.header('x-github-event') ?? '';

  if (WEBHOOK_SECRET && !(await verifySignature(body, sig))) {
    return c.json({ error: 'invalid signature' }, 401);
  }

  let payload: Record<string, unknown>;
  try { payload = JSON.parse(body) as Record<string, unknown>; }
  catch { return c.json({ error: 'invalid json' }, 400); }

  const pool = getPool();

  // installation created / new repos added
  if (event === 'installation' || event === 'installation_repositories') {
    await handleInstallation(pool, payload);
    return c.json({ ok: true });
  }

  // PR opened / synchronize → create a run
  if (event === 'pull_request') {
    await handlePullRequest(pool, payload);
    return c.json({ ok: true });
  }

  return c.json({ ok: true, skipped: event });
});

async function handleInstallation(pool: ReturnType<typeof getPool>, payload: Record<string, unknown>) {
  const inst = payload['installation'] as {
    id: number; account: { login: string; id: number; type: string };
  };
  const reposAdded = (payload['repositories_added'] ?? payload['repositories'] ?? []) as {
    id: number; full_name: string; name: string;
  }[];

  // Upsert installation
  await pool.query(
    `INSERT INTO installation (github_id, account_login, account_type, tier)
     VALUES ($1, $2, $3, 'free')
     ON CONFLICT (github_id) DO UPDATE
       SET account_login = EXCLUDED.account_login,
           updated_at    = NOW()`,
    [inst.id, inst.account.login, inst.account.type === 'Organization' ? 'Organization' : 'User'],
  );

  const { rows } = await pool.query<{ id: string }>(
    `SELECT id FROM installation WHERE github_id = $1`, [inst.id],
  );
  const installation = rows[0];
  if (!installation) return;

  // Upsert repos
  for (const repo of reposAdded) {
    await pool.query(
      `INSERT INTO repository (installation_id, github_id, full_name, default_branch)
       VALUES ($1, $2, $3, 'main')
       ON CONFLICT (github_id) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             updated_at = NOW()`,
      [installation.id, repo.id, repo.full_name],
    );
  }
}

async function handlePullRequest(pool: ReturnType<typeof getPool>, payload: Record<string, unknown>) {
  const action = payload['action'] as string;
  if (!['opened', 'synchronize', 'reopened'].includes(action)) return;

  const pr = payload['pull_request'] as {
    number: number; title: string; body: string | null;
    user: { login: string };
    head: { sha: string; ref: string };
    base: { ref: string };
  };
  const repoData = payload['repository'] as { id: number; full_name: string };
  const instData = payload['installation'] as { id: number };

  // Resolve installation and repo
  const { rows: [installation] } = await pool.query<{ id: string }>(
    `SELECT id FROM installation WHERE github_id = $1`, [instData.id],
  );
  if (!installation) { console.warn('Unknown installation', instData.id); return; }

  const { rows: [repository] } = await pool.query<{ id: string }>(
    `SELECT id FROM repository WHERE github_id = $1`, [repoData.id],
  );
  if (!repository) { console.warn('Unknown repository', repoData.id); return; }

  // Upsert pull request
  await pool.query(
    `INSERT INTO pull_request
       (repository_id, github_number, title, author_login, head_sha, head_branch, base_branch, body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (repository_id, github_number) DO UPDATE
       SET head_sha    = EXCLUDED.head_sha,
           title       = EXCLUDED.title,
           state       = 'open',
           updated_at  = NOW()`,
    [repository.id, pr.number, pr.title, pr.user.login, pr.head.sha, pr.head.ref, pr.base.ref, pr.body ?? ''],
  );

  const { rows: prRows } = await pool.query<{ id: string }>(
    `SELECT id FROM pull_request WHERE repository_id = $1 AND github_number = $2`,
    [repository.id, pr.number],
  );
  const pullRequest = prRows[0];
  if (!pullRequest) return;

  // Create a queued run
  await pool.query(
    `INSERT INTO run
       (pull_request_id, repository_id, installation_id, sha, mode, state, triggered_by)
     VALUES ($1, $2, $3, $4, 'smoke', 'queued', $5)`,
    [pullRequest.id, repository.id, installation.id, pr.head.sha, action === 'opened' ? 'pr.opened' : 'pr.synchronize'],
  );

  const eventTypeMap: Record<string, EventType> = {
    opened: EventType.PullRequestOpened,
    synchronize: EventType.PullRequestSynchronize,
    reopened: EventType.PullRequestReopened,
    closed: EventType.PullRequestClosed,
  };
  const eventType = eventTypeMap[action] ?? EventType.PullRequestOpened;

  const isFork = (payload['pull_request'] as { head: { repo: { fork: boolean } } })?.head?.repo?.fork ?? false;

  await enqueueEvent({
    messageId: randomUUID(),
    correlationId: randomUUID(),
    eventType,
    installationId: installation.id,
    repositoryId: repository.id,
    occurredAt: new Date().toISOString(),
    payload: {
      pullRequestId: pullRequest.id,
      githubNumber: pr.number,
      sha: pr.head.sha,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      authorLogin: pr.user.login,
      isFork,
      title: pr.title,
      body: pr.body ?? null,
    },
  });

  console.log(`Created run for PR #${pr.number} in ${repoData.full_name}`);
}

export default app;
