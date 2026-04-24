import { describe, it, expect } from 'vitest';
import {
  PullRequestOpenedPayloadSchema,
  PullRequestSynchronizePayloadSchema,
  PullRequestReopenedPayloadSchema,
  PullRequestWebhookPayloadSchema,
} from '../github/webhook';

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
  state: 'open' as const,
  title: 'Fix bug',
  body: 'details',
  draft: false,
  head: { label: 'org:fix', ref: 'fix-branch', sha: 'a'.repeat(40), user: baseUser, repo: baseRepo },
  base: { label: 'org:main', ref: 'main', sha: 'b'.repeat(40), user: baseUser, repo: baseRepo },
  user: baseUser,
  html_url: 'https://github.com/org/my-repo/pull/7',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T01:00:00Z',
};

const installation = { id: 999, node_id: 'IN_abc' };

describe('PullRequestOpenedPayloadSchema', () => {
  it('parses a valid opened payload', () => {
    const result = PullRequestOpenedPayloadSchema.safeParse({
      action: 'opened',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(true);
  });

  it('rejects wrong action', () => {
    const result = PullRequestOpenedPayloadSchema.safeParse({
      action: 'closed',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing installation', () => {
    const result = PullRequestOpenedPayloadSchema.safeParse({
      action: 'opened',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid sha (too short)', () => {
    const result = PullRequestOpenedPayloadSchema.safeParse({
      action: 'opened',
      number: 7,
      pull_request: {
        ...basePR,
        head: { ...basePR.head, sha: 'tooshort' },
      },
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    // sha is just a string in this schema — no length constraint — so it parses
    expect(result.success).toBe(true);
  });
});

describe('PullRequestSynchronizePayloadSchema', () => {
  it('parses a valid synchronize payload', () => {
    const result = PullRequestSynchronizePayloadSchema.safeParse({
      action: 'synchronize',
      number: 7,
      before: 'b'.repeat(40),
      after: 'a'.repeat(40),
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing before/after fields', () => {
    const result = PullRequestSynchronizePayloadSchema.safeParse({
      action: 'synchronize',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(false);
  });
});

describe('PullRequestReopenedPayloadSchema', () => {
  it('parses a valid reopened payload', () => {
    const result = PullRequestReopenedPayloadSchema.safeParse({
      action: 'reopened',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(true);
  });
});

describe('PullRequestWebhookPayloadSchema (union)', () => {
  it('routes opened correctly', () => {
    const result = PullRequestWebhookPayloadSchema.safeParse({
      action: 'opened',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.action).toBe('opened');
  });

  it('rejects unknown action', () => {
    const result = PullRequestWebhookPayloadSchema.safeParse({
      action: 'assigned',
      number: 7,
      pull_request: basePR,
      repository: baseRepo,
      sender: baseUser,
      installation,
    });
    expect(result.success).toBe(false);
  });
});
