import { describe, it, expect, vi } from 'vitest';
import { Pool } from 'pg';
import { RunState, RunMode } from '@preview-qa/domain';
import {
  createRun,
  getRunById,
  getRunsForPR,
  getActiveRunsForPR,
  updateRun,
  cancelSupersededRuns,
  transitionRunState,
} from '../repositories/run';
import type { Run } from '../types';

function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    pull_request_id: 'pr-1',
    repository_id: 'repo-1',
    installation_id: 'inst-1',
    sha: 'abc123',
    mode: RunMode.Smoke,
    state: RunState.Queued,
    preview_url: null,
    triggered_by: 'push',
    github_check_id: null,
    started_at: null,
    completed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makePool(queryResult: object): Pool {
  return { query: vi.fn().mockResolvedValue(queryResult) } as unknown as Pool;
}

describe('createRun', () => {
  it('inserts a row and returns it', async () => {
    const run = makeRun();
    const pool = makePool({ rows: [run] });

    const result = await createRun(pool, {
      pull_request_id: 'pr-1',
      repository_id: 'repo-1',
      installation_id: 'inst-1',
      sha: 'abc123',
      mode: RunMode.Smoke,
    });

    expect(result).toEqual(run);
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    expect(mockQ).toHaveBeenCalledOnce();
  });

  it('throws if no row returned', async () => {
    const pool = makePool({ rows: [] });
    await expect(
      createRun(pool, {
        pull_request_id: 'pr-1',
        repository_id: 'repo-1',
        installation_id: 'inst-1',
        sha: 'abc123',
        mode: RunMode.Smoke,
      }),
    ).rejects.toThrow('createRun: no row returned');
  });
});

describe('getRunById', () => {
  it('returns the run when found', async () => {
    const run = makeRun();
    const pool = makePool({ rows: [run] });
    expect(await getRunById(pool, 'run-1')).toEqual(run);
  });

  it('returns null when not found', async () => {
    const pool = makePool({ rows: [] });
    expect(await getRunById(pool, 'missing')).toBeNull();
  });
});

describe('getRunsForPR', () => {
  it('returns all runs for a PR', async () => {
    const runs = [makeRun({ id: 'run-1' }), makeRun({ id: 'run-2' })];
    const pool = makePool({ rows: runs });
    expect(await getRunsForPR(pool, 'pr-1')).toHaveLength(2);
  });
});

describe('getActiveRunsForPR', () => {
  it('queries with terminal states excluded', async () => {
    const pool = makePool({ rows: [] });
    await getActiveRunsForPR(pool, 'pr-1');
    const mockQuery = pool.query as ReturnType<typeof vi.fn>;
    const firstCall = mockQuery.mock.calls[0] as unknown[];
    expect(firstCall[0]).toContain('state != ALL');
  });
});

describe('updateRun', () => {
  it('updates specified fields and returns the updated run', async () => {
    const updated = makeRun({ state: RunState.Running });
    const pool = makePool({ rows: [updated] });
    const result = await updateRun(pool, 'run-1', { state: RunState.Running });
    expect(result.state).toBe(RunState.Running);
  });

  it('returns existing run when no fields provided', async () => {
    const run = makeRun();
    const pool = makePool({ rows: [run] });
    const result = await updateRun(pool, 'run-1', {});
    expect(result).toEqual(run);
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    expect(mockQ).toHaveBeenCalledOnce();
  });

  it('throws when run not found on update', async () => {
    const pool = makePool({ rows: [] });
    await expect(updateRun(pool, 'missing', { state: RunState.Running })).rejects.toThrow(
      'updateRun: run missing not found',
    );
  });
});

describe('cancelSupersededRuns', () => {
  it('returns number of canceled rows', async () => {
    const pool = makePool({ rowCount: 2 });
    const count = await cancelSupersededRuns(pool, 'pr-1', 'new-sha');
    expect(count).toBe(2);
  });

  it('returns 0 when rowCount is null', async () => {
    const pool = makePool({ rowCount: null });
    expect(await cancelSupersededRuns(pool, 'pr-1', 'sha')).toBe(0);
  });
});

describe('transitionRunState', () => {
  it('returns updated run on successful transition', async () => {
    const run = makeRun({ state: RunState.Running });
    const pool = makePool({ rows: [run] });
    const result = await transitionRunState(pool, 'run-1', RunState.Queued, RunState.Running);
    expect(result?.state).toBe(RunState.Running);
  });

  it('returns null when state did not match (optimistic lock miss)', async () => {
    const pool = makePool({ rows: [] });
    const result = await transitionRunState(pool, 'run-1', RunState.Queued, RunState.Running);
    expect(result).toBeNull();
  });
});
