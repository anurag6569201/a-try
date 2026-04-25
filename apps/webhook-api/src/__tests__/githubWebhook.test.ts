import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'crypto';
import type { HttpRequest, InvocationContext } from '@azure/functions';

vi.mock('../lib/servicebus', () => ({
  enqueueEvent: vi.fn().mockResolvedValue(undefined),
}));

// Set secret before any module that reads it at import time
process.env['GITHUB_WEBHOOK_SECRET'] = 'test-secret';

import { githubWebhookHandler } from '../functions/githubWebhook';
import { enqueueEvent } from '../lib/servicebus';

const SECRET = 'test-secret';

function sign(body: string): string {
  return `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;
}

function makeRequest(body: string, event: string, sig?: string): HttpRequest {
  const headers = new Map<string, string>([
    ['x-github-event', event],
    ['x-hub-signature-256', sig ?? sign(body)],
    ['x-github-delivery', 'delivery-abc'],
  ]);
  return {
    text: () => Promise.resolve(body),
    headers: { get: (k: string) => headers.get(k) ?? null },
  } as unknown as HttpRequest;
}

function makeContext(): InvocationContext {
  return {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as InvocationContext;
}

const baseRepo = {
  id: 1,
  name: 'my-repo',
  full_name: 'org/my-repo',
  private: false,
  fork: false,
  default_branch: 'main',
  clone_url: 'https://github.com/org/my-repo.git',
  html_url: 'https://github.com/org/my-repo',
  owner: { id: 10, login: 'org', type: 'Organization' },
};
const baseUser = { id: 42, login: 'dev', type: 'User' };
const basePR = {
  id: 100,
  number: 7,
  state: 'open',
  title: 'Fix bug',
  body: null,
  draft: false,
  head: { label: 'org:fix', ref: 'fix', sha: 'a'.repeat(40), user: baseUser, repo: baseRepo },
  base: { label: 'org:main', ref: 'main', sha: 'b'.repeat(40), user: baseUser, repo: { ...baseRepo, fork: false } },
  user: baseUser,
  html_url: 'https://github.com/org/my-repo/pull/7',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T01:00:00Z',
};
const installation = { id: 999, node_id: 'IN_abc' };

function makePRPayload(action: string): string {
  return JSON.stringify({ action, number: 7, pull_request: basePR, repository: baseRepo, sender: baseUser, installation });
}

describe('githubWebhookHandler — signature validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 for missing signature', async () => {
    const body = makePRPayload('opened');
    const req = makeRequest(body, 'pull_request', '');
    const res = await githubWebhookHandler(req, makeContext());
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong signature', async () => {
    const body = makePRPayload('opened');
    const req = makeRequest(body, 'pull_request', 'sha256=badbadbadbad');
    const res = await githubWebhookHandler(req, makeContext());
    expect(res.status).toBe(401);
  });
});

describe('githubWebhookHandler — pull_request events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 202 and enqueues for opened', async () => {
    const body = makePRPayload('opened');
    const res = await githubWebhookHandler(makeRequest(body, 'pull_request'), makeContext());
    expect(res.status).toBe(202);
    expect(enqueueEvent).toHaveBeenCalledOnce();
  });

  it('returns 202 and enqueues for synchronize', async () => {
    const body = JSON.stringify({
      action: 'synchronize',
      number: 7,
      before: 'b'.repeat(40),
      after: 'a'.repeat(40),
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    const res = await githubWebhookHandler(makeRequest(body, 'pull_request'), makeContext());
    expect(res.status).toBe(202);
    expect(enqueueEvent).toHaveBeenCalledOnce();
  });

  it('returns 200 and does not enqueue for closed', async () => {
    const body = makePRPayload('closed');
    const res = await githubWebhookHandler(makeRequest(body, 'pull_request'), makeContext());
    expect(res.status).toBe(200);
    expect(enqueueEvent).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON', async () => {
    const body = 'not json';
    const res = await githubWebhookHandler(makeRequest(body, 'pull_request'), makeContext());
    expect(res.status).toBe(400);
  });
});

describe('githubWebhookHandler — deployment_status events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 202 and enqueues for deployment_status created', async () => {
    const body = JSON.stringify({
      action: 'created',
      deployment_status: {
        id: 1,
        state: 'success',
        environment: 'preview',
        environment_url: 'https://preview.example.com',
        log_url: null,
        description: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      deployment: { id: 1, sha: 'a'.repeat(40), ref: 'fix', environment: 'preview', description: null },
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    const res = await githubWebhookHandler(makeRequest(body, 'deployment_status'), makeContext());
    expect(res.status).toBe(202);
    expect(enqueueEvent).toHaveBeenCalledOnce();
  });
});

describe('githubWebhookHandler — ignored events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 for unhandled event types', async () => {
    const body = JSON.stringify({ action: 'labeled' });
    const res = await githubWebhookHandler(makeRequest(body, 'issues'), makeContext());
    expect(res.status).toBe(200);
    expect(enqueueEvent).not.toHaveBeenCalled();
  });
});
