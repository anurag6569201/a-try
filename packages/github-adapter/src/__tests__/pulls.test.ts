import { describe, it, expect, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { getPRMetadata, getPRChangedFiles } from '../pulls.js';

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

  it('handles null user', async () => {
    const octokit = {
      pulls: {
        get: vi.fn().mockResolvedValue({
          data: {
            id: 100, number: 7, title: 'Fix', body: null, state: 'open', draft: false,
            user: null,
            head: { sha: 'a'.repeat(40), ref: 'fix', repo: { fork: false } },
            base: { ref: 'main' },
          },
        }),
      },
    } as unknown as Octokit;
    const meta = await getPRMetadata(octokit, 'org', 'repo', 7);
    expect(meta.authorLogin).toBe('unknown');
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

describe('getPRChangedFiles', () => {
  it('returns filenames from a single page', async () => {
    const octokit = {
      pulls: {
        listFiles: vi.fn().mockResolvedValue({
          data: [
            { filename: 'app/dashboard/page.tsx' },
            { filename: 'components/Button.tsx' },
          ],
        }),
      },
    } as unknown as Octokit;
    const files = await getPRChangedFiles(octokit, 'org', 'repo', 1);
    expect(files).toEqual(['app/dashboard/page.tsx', 'components/Button.tsx']);
    expect((octokit.pulls.listFiles as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toMatchObject({
      page: 1,
      per_page: 30,
    });
  });

  it('paginates when first page is full (30 items)', async () => {
    const page1 = Array.from({ length: 30 }, (_, i) => ({ filename: `file-${i}.ts` }));
    const page2 = [{ filename: 'file-30.ts' }];
    const listFiles = vi.fn()
      .mockResolvedValueOnce({ data: page1 })
      .mockResolvedValueOnce({ data: page2 });
    const octokit = { pulls: { listFiles } } as unknown as Octokit;
    const files = await getPRChangedFiles(octokit, 'org', 'repo', 1);
    expect(files).toHaveLength(31);
    expect(listFiles).toHaveBeenCalledTimes(2);
  });

  it('stops at page 3 even if results are full', async () => {
    const fullPage = Array.from({ length: 30 }, (_, i) => ({ filename: `file-${i}.ts` }));
    const listFiles = vi.fn().mockResolvedValue({ data: fullPage });
    const octokit = { pulls: { listFiles } } as unknown as Octokit;
    const files = await getPRChangedFiles(octokit, 'org', 'repo', 1);
    expect(files).toHaveLength(90);
    expect(listFiles).toHaveBeenCalledTimes(3);
  });

  it('returns empty array when PR has no changed files', async () => {
    const octokit = {
      pulls: { listFiles: vi.fn().mockResolvedValue({ data: [] }) },
    } as unknown as Octokit;
    const files = await getPRChangedFiles(octokit, 'org', 'repo', 1);
    expect(files).toEqual([]);
  });
});
