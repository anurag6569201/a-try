import { describe, it, expect, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { upsertStickyComment } from '../comments.js';

function makeOctokit(listComments: object[] = []): Octokit {
  return {
    issues: {
      listComments: vi.fn().mockResolvedValue({ data: listComments }),
      createComment: vi.fn().mockResolvedValue({ data: { id: 99 } }),
      updateComment: vi.fn().mockResolvedValue({ data: { id: 55 } }),
    },
  } as unknown as Octokit;
}

describe('upsertStickyComment', () => {
  it('creates a new comment when none exists', async () => {
    const octokit = makeOctokit([]);
    const id = await upsertStickyComment(octokit, {
      owner: 'org',
      repo: 'my-repo',
      pullNumber: 7,
      body: 'QA result',
    });
    expect(id).toBe(99);
    const mockCreate = octokit.issues.createComment as unknown as ReturnType<typeof vi.fn>;
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it('updates existing comment when sticky marker found', async () => {
    const octokit = makeOctokit([
      { id: 55, body: '<!-- preview-qa-sticky -->\nOld result' },
    ]);
    const id = await upsertStickyComment(octokit, {
      owner: 'org',
      repo: 'my-repo',
      pullNumber: 7,
      body: 'New QA result',
    });
    expect(id).toBe(55);
    const mockUpdate = octokit.issues.updateComment as unknown as ReturnType<typeof vi.fn>;
    expect(mockUpdate).toHaveBeenCalledOnce();
    const mockCreate = octokit.issues.createComment as unknown as ReturnType<typeof vi.fn>;
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('updates directly when existingCommentId is supplied', async () => {
    const octokit = makeOctokit([]);
    const id = await upsertStickyComment(octokit, {
      owner: 'org',
      repo: 'my-repo',
      pullNumber: 7,
      body: 'Updated result',
      existingCommentId: 55,
    });
    expect(id).toBe(55);
    const mockUpdate = octokit.issues.updateComment as unknown as ReturnType<typeof vi.fn>;
    expect(mockUpdate).toHaveBeenCalledOnce();
    const mockList = octokit.issues.listComments as unknown as ReturnType<typeof vi.fn>;
    expect(mockList).not.toHaveBeenCalled();
  });

  it('appends sticky marker to comment body', async () => {
    const octokit = makeOctokit([]);
    await upsertStickyComment(octokit, {
      owner: 'org',
      repo: 'my-repo',
      pullNumber: 7,
      body: 'QA result',
    });
    const mockCreate = octokit.issues.createComment as unknown as ReturnType<typeof vi.fn>;
    const call = mockCreate.mock.calls[0] as [Record<string, unknown>];
    expect(String(call[0]?.['body'])).toContain('<!-- preview-qa-sticky -->');
  });
});
