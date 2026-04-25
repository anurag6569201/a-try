import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunState } from '@preview-qa/domain';
import { transition, isTerminal } from '../statemachine.js';

vi.mock('@preview-qa/db', () => ({
  transitionRunState: vi.fn(),
  updateRun: vi.fn(),
}));

import { transitionRunState, updateRun } from '@preview-qa/db';

const mockTransition = transitionRunState as unknown as ReturnType<typeof vi.fn>;
const mockUpdateRun = updateRun as unknown as ReturnType<typeof vi.fn>;

const fakePool = {} as Parameters<typeof transition>[0];

const makeRun = (state: RunState) => ({
  id: 'run-1',
  state,
  pull_request_id: 'pr-1',
  repository_id: 'repo-1',
  installation_id: 'inst-1',
  sha: 'a'.repeat(40),
  mode: 'smoke' as const,
  preview_url: null,
  triggered_by: 'push',
  github_check_id: null,
  started_at: null,
  completed_at: null,
  created_at: new Date(),
  updated_at: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('transition', () => {
  it('returns success=false when optimistic lock fails (run already transitioned)', async () => {
    mockTransition.mockResolvedValue(null);

    const result = await transition(fakePool, 'run-1', RunState.Queued, RunState.WaitingForPreview);

    expect(result.success).toBe(false);
    expect(result.run).toBeNull();
    expect(mockUpdateRun).not.toHaveBeenCalled();
  });

  it('returns success=true and the updated run when transition succeeds without extra fields', async () => {
    const run = makeRun(RunState.WaitingForPreview);
    mockTransition.mockResolvedValue(run);

    const result = await transition(fakePool, 'run-1', RunState.Queued, RunState.WaitingForPreview);

    expect(result.success).toBe(true);
    expect(result.run).toEqual(run);
    expect(mockUpdateRun).not.toHaveBeenCalled();
  });

  it('calls updateRun when extra fields are provided', async () => {
    const run = makeRun(RunState.WaitingForPreview);
    const updatedRun = { ...run, github_check_id: 42 };
    mockTransition.mockResolvedValue(run);
    mockUpdateRun.mockResolvedValue(updatedRun);

    const result = await transition(fakePool, 'run-1', RunState.Queued, RunState.WaitingForPreview, {
      githubCheckId: 42,
    });

    expect(mockUpdateRun).toHaveBeenCalledWith(fakePool, 'run-1', { github_check_id: 42 });
    expect(result.success).toBe(true);
    expect(result.run).toEqual(updatedRun);
  });

  it('passes previewUrl and startedAt to updateRun', async () => {
    const run = makeRun(RunState.Planning);
    mockTransition.mockResolvedValue(run);
    mockUpdateRun.mockResolvedValue(run);

    const startedAt = new Date();
    await transition(fakePool, 'run-1', RunState.WaitingForPreview, RunState.Planning, {
      previewUrl: 'https://preview.vercel.app',
      startedAt,
    });

    expect(mockUpdateRun).toHaveBeenCalledWith(fakePool, 'run-1', {
      preview_url: 'https://preview.vercel.app',
      started_at: startedAt,
    });
  });
});

describe('isTerminal', () => {
  it('returns true for terminal states', () => {
    expect(isTerminal(RunState.Completed)).toBe(true);
    expect(isTerminal(RunState.Failed)).toBe(true);
    expect(isTerminal(RunState.Canceled)).toBe(true);
    expect(isTerminal(RunState.BlockedEnvironment)).toBe(true);
  });

  it('returns false for non-terminal states', () => {
    expect(isTerminal(RunState.Queued)).toBe(false);
    expect(isTerminal(RunState.WaitingForPreview)).toBe(false);
    expect(isTerminal(RunState.Planning)).toBe(false);
    expect(isTerminal(RunState.Running)).toBe(false);
    expect(isTerminal(RunState.Analyzing)).toBe(false);
    expect(isTerminal(RunState.Reporting)).toBe(false);
    expect(isTerminal(RunState.NeedsHuman)).toBe(false);
  });
});
