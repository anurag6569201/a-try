import { describe, it, expect, vi, beforeEach } from 'vitest';
import { upsertRunEmbedding, findSimilarRuns } from '../repositories/embedding.js';

function makePool(queryResult: object) {
  return { query: vi.fn().mockResolvedValue(queryResult) } as unknown as Parameters<typeof upsertRunEmbedding>[0];
}

beforeEach(() => vi.clearAllMocks());

describe('upsertRunEmbedding', () => {
  it('calls INSERT ... ON CONFLICT with vector literal', async () => {
    const pool = makePool({ rowCount: 1 });
    await upsertRunEmbedding(pool, {
      run_id: 'run-1',
      summary_text: 'click failed: element not found',
      embedding: [0.1, 0.2, 0.3],
      model: 'text-embedding-3-small',
    });
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const call = mockQ.mock.calls[0] as unknown[];
    expect(call[0]).toMatch(/INSERT INTO run_embedding/);
    expect(call[0]).toMatch(/ON CONFLICT/);
    const params = call[1] as unknown[];
    expect(params[2]).toBe('[0.1,0.2,0.3]');
  });

  it('passes all fields to the query', async () => {
    const pool = makePool({ rowCount: 1 });
    await upsertRunEmbedding(pool, {
      run_id: 'run-2',
      summary_text: 'navigation timeout',
      embedding: [0.5, 0.6],
      model: 'ada-002',
    });
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const params = (mockQ.mock.calls[0] as unknown[])[1] as unknown[];
    expect(params[0]).toBe('run-2');
    expect(params[1]).toBe('navigation timeout');
    expect(params[3]).toBe('ada-002');
  });
});

describe('findSimilarRuns', () => {
  it('returns mapped SimilarRun results', async () => {
    const pool = makePool({
      rows: [
        { run_id: 'run-10', summary_text: 'click failed', distance: '0.12' },
        { run_id: 'run-11', summary_text: 'navigate timeout', distance: '0.34' },
      ],
    });
    const results = await findSimilarRuns(pool, [0.1, 0.2, 0.3]);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ run_id: 'run-10', summary_text: 'click failed', distance: 0.12 });
    expect(results[1]).toMatchObject({ run_id: 'run-11', distance: 0.34 });
  });

  it('passes the vector literal correctly', async () => {
    const pool = makePool({ rows: [] });
    await findSimilarRuns(pool, [1, 2, 3], 3, 'run-exclude');
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const params = (mockQ.mock.calls[0] as unknown[])[1] as unknown[];
    expect(params[0]).toBe('[1,2,3]');
    expect(params[1]).toBe('run-exclude');
    expect(params[2]).toBe(3);
  });

  it('uses null for excludeRunId when not provided', async () => {
    const pool = makePool({ rows: [] });
    await findSimilarRuns(pool, [0.1], 3);
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const params = (mockQ.mock.calls[0] as unknown[])[1] as unknown[];
    expect(params[1]).toBeNull();
  });

  it('returns empty array when no rows', async () => {
    const pool = makePool({ rows: [] });
    const results = await findSimilarRuns(pool, [0.1, 0.2]);
    expect(results).toEqual([]);
  });
});
