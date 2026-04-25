import { describe, it, expect, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { getPRMetadata } from '../pulls.js';

function makeOctokit(): Octokit {
  return {
    pulls: {
      get: vi.fn().mockResolvedValue({
        data: {
          id: 100,
          number: 7,
          title: 'Fix bug',
          body: 'details',
          state: 'open',
          draft: false,
          user: { login: 'dev' },
          head: { sha: 'a'.repeat(40), ref: 'fix-branch', repo: { fork: false } },
          base: { ref: 'main' },
        },
      }),
    },
  } as unknown as Octokit;
}

describe('getPRMetadata', () => {
  it('returns normalized PR metadata', async () => {
    const octokit = makeOctokit();
    const meta = await getPRMetadata(octokit, 'org', 'my-repo', 7);
    expect(meta.number).toBe(7);
    expect(meta.headSha).toBe('a'.repeat(40));
    expect(meta.headBranch).toBe('fix-branch');
    expect(meta.baseBranch).toBe('main');
    expect(meta.authorLogin).toBe('dev');
    expect(meta.isFork).toBe(false);
    expect(meta.isDraft).toBe(false);
  });

  it('handles null body', async () => {
    const octokit = {
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: {
            id: 100, number: 7, title: 'Fix', body: null, state: 'open', draft: false,
            user: { login: 'dev' },
            head: { sha: 'a'.repeat(40), ref: 'fix', repo: { fork: false } },
            base: { ref: 'main' },
          },
        }),
      },
    } as unknown as Octokit;
    const meta = await getPRMetadata(octokit, 'org', 'repo', 7);
    expect(meta.body).toBeNull();
  });
});
