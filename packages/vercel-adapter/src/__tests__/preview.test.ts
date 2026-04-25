import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePreviewUrl, resolvePreviewFromGitHubDeployments } from '../preview.js';
import * as client from '../client.js';
import type { VercelDeployment, GitHubDeployment } from '../types.js';

const config = { apiToken: 'tok_test' };
const SHA = 'a'.repeat(40);

function makeDeployment(overrides: Partial<VercelDeployment> = {}): VercelDeployment {
  return {
    uid: 'dpl_1',
    url: 'my-app-abc123.vercel.app',
    state: 'READY',
    meta: { githubCommitSha: SHA },
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('resolvePreviewUrl — Vercel API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns resolved when a READY deployment matches the SHA', async () => {
    vi.spyOn(client, 'listDeployments').mockResolvedValue([makeDeployment()]);
    const result = await resolvePreviewUrl(config, 'proj_1', SHA);
    expect(result.status).toBe('resolved');
    expect(result.url).toBe('https://my-app-abc123.vercel.app');
  });

  it('returns waiting_for_preview when deployment is still BUILDING', async () => {
    vi.spyOn(client, 'listDeployments').mockResolvedValue([
      makeDeployment({ state: 'BUILDING' }),
    ]);
    const result = await resolvePreviewUrl(config, 'proj_1', SHA);
    expect(result.status).toBe('waiting_for_preview');
  });

  it('returns not_found when no deployment matches the SHA', async () => {
    vi.spyOn(client, 'listDeployments').mockResolvedValue([
      makeDeployment({ meta: { githubCommitSha: 'different-sha' } }),
    ]);
    const result = await resolvePreviewUrl(config, 'proj_1', SHA);
    expect(result.status).toBe('not_found');
  });

  it('returns waiting_for_preview when Vercel API throws', async () => {
    vi.spyOn(client, 'listDeployments').mockRejectedValue(new Error('API error'));
    const result = await resolvePreviewUrl(config, 'proj_1', SHA);
    expect(result.status).toBe('waiting_for_preview');
  });

  it('ignores deployments with wrong SHA in meta', async () => {
    vi.spyOn(client, 'listDeployments').mockResolvedValue([
      makeDeployment({ state: 'READY', meta: { githubCommitSha: 'wrong' } }),
    ]);
    const result = await resolvePreviewUrl(config, 'proj_1', SHA);
    expect(result.status).toBe('not_found');
  });
});

describe('resolvePreviewFromGitHubDeployments — fallback', () => {
  function makeGHDeployment(overrides: Partial<GitHubDeployment> = {}): GitHubDeployment {
    return {
      id: 1,
      sha: SHA,
      environment: 'Preview',
      environmentUrl: 'https://preview.example.com',
      state: 'success',
      ...overrides,
    };
  }

  it('returns resolved when a successful preview deployment exists', () => {
    const result = resolvePreviewFromGitHubDeployments([makeGHDeployment()], SHA);
    expect(result.status).toBe('resolved');
    expect(result.url).toBe('https://preview.example.com');
  });

  it('returns waiting_for_preview when deployment is pending', () => {
    const result = resolvePreviewFromGitHubDeployments(
      [makeGHDeployment({ state: 'pending', environmentUrl: null })],
      SHA,
    );
    expect(result.status).toBe('waiting_for_preview');
  });

  it('returns not_found when no matching SHA', () => {
    const result = resolvePreviewFromGitHubDeployments(
      [makeGHDeployment({ sha: 'other-sha' })],
      SHA,
    );
    expect(result.status).toBe('not_found');
  });

  it('ignores non-preview environments', () => {
    const result = resolvePreviewFromGitHubDeployments(
      [makeGHDeployment({ environment: 'production' })],
      SHA,
    );
    expect(result.status).toBe('not_found');
  });

  it('returns not_found for empty deployments list', () => {
    const result = resolvePreviewFromGitHubDeployments([], SHA);
    expect(result.status).toBe('not_found');
  });
});
