import { describe, it, expect, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { createCheckRun, updateCheckRun } from '../checks.js';

function makeOctokit(overrides: Partial<Octokit> = {}): Octokit {
  return {
    checks: {
      create: vi.fn().mockResolvedValue({ data: { id: 42 } }),
      update: vi.fn().mockResolvedValue({ data: {} }),
    },
    ...overrides,
  } as unknown as Octokit;
}

describe('createCheckRun', () => {
  it('calls octokit.checks.create and returns the check run id', async () => {
    const octokit = makeOctokit();
    const id = await createCheckRun(octokit, {
      owner: 'org',
      repo: 'my-repo',
      name: 'Preview QA',
      headSha: 'a'.repeat(40),
      status: 'queued',
    });
    expect(id).toBe(42);
    const mockCreate = octokit.checks.create as unknown as ReturnType<typeof vi.fn>;
    expect(mockCreate).toHaveBeenCalledOnce();
    const call = mockCreate.mock.calls[0] as [Record<string, unknown>];
    expect(call[0]).toMatchObject({ owner: 'org', repo: 'my-repo', status: 'queued' });
  });

  it('passes output when provided', async () => {
    const octokit = makeOctokit();
    await createCheckRun(octokit, {
      owner: 'org',
      repo: 'my-repo',
      name: 'Preview QA',
      headSha: 'a'.repeat(40),
      status: 'in_progress',
      output: { title: 'Running', summary: 'Tests are running...' },
    });
    const mockCreate = octokit.checks.create as unknown as ReturnType<typeof vi.fn>;
    const call = mockCreate.mock.calls[0] as [Record<string, unknown>];
    expect(call[0]).toHaveProperty('output.title', 'Running');
  });
});

describe('updateCheckRun', () => {
  it('calls octokit.checks.update with correct params', async () => {
    const octokit = makeOctokit();
    await updateCheckRun(octokit, {
      owner: 'org',
      repo: 'my-repo',
      checkRunId: 42,
      status: 'completed',
      conclusion: 'success',
      completedAt: new Date().toISOString(),
    });
    const mockUpdate = octokit.checks.update as unknown as ReturnType<typeof vi.fn>;
    expect(mockUpdate).toHaveBeenCalledOnce();
    const call = mockUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(call[0]).toMatchObject({ check_run_id: 42, conclusion: 'success' });
  });
});
