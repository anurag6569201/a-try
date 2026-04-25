import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockEmbedText = vi.fn().mockResolvedValue([0.1, 0.2, 0.3]);
  const mockUpsertRunEmbedding = vi.fn().mockResolvedValue(undefined);
  const mockFindSimilarRuns = vi.fn().mockResolvedValue([]);
  return { mockEmbedText, mockUpsertRunEmbedding, mockFindSimilarRuns };
});

vi.mock('@preview-qa/ai', () => ({
  embedText: mocks.mockEmbedText,
}));

vi.mock('@preview-qa/db', () => ({
  upsertRunEmbedding: mocks.mockUpsertRunEmbedding,
  findSimilarRuns: mocks.mockFindSimilarRuns,
}));

import { storeRunSummary, retrieveSimilarRuns, formatSimilarRunsContext } from '../retrieval.js';
import type { SimilarRun } from '@preview-qa/db';

const fakeClient = {} as Parameters<typeof storeRunSummary>[0];
const fakePool = {} as Parameters<typeof storeRunSummary>[1];

beforeEach(() => vi.clearAllMocks());

describe('storeRunSummary', () => {
  it('calls embedText then upsertRunEmbedding', async () => {
    mocks.mockEmbedText.mockResolvedValue([0.5, 0.6]);
    await storeRunSummary(fakeClient, fakePool, {
      runId: 'run-1',
      summaryText: 'click failed: button not found',
      deployment: 'text-embedding-3-small',
      model: 'text-embedding-3-small',
    });
    expect(mocks.mockEmbedText).toHaveBeenCalledWith(fakeClient, 'text-embedding-3-small', 'click failed: button not found');
    expect(mocks.mockUpsertRunEmbedding).toHaveBeenCalledWith(fakePool, {
      run_id: 'run-1',
      summary_text: 'click failed: button not found',
      embedding: [0.5, 0.6],
      model: 'text-embedding-3-small',
    });
  });

  it('propagates embedText errors', async () => {
    mocks.mockEmbedText.mockRejectedValue(new Error('embedding API error'));
    await expect(
      storeRunSummary(fakeClient, fakePool, {
        runId: 'run-2',
        summaryText: 'timeout',
        deployment: 'embeddings',
        model: 'text-embedding-3-small',
      }),
    ).rejects.toThrow('embedding API error');
    expect(mocks.mockUpsertRunEmbedding).not.toHaveBeenCalled();
  });
});

describe('retrieveSimilarRuns', () => {
  it('calls embedText and findSimilarRuns with defaults', async () => {
    mocks.mockEmbedText.mockResolvedValue([0.1, 0.2]);
    await retrieveSimilarRuns(fakeClient, fakePool, {
      summaryText: 'navigate timeout',
      deployment: 'embeddings',
    });
    expect(mocks.mockEmbedText).toHaveBeenCalledWith(fakeClient, 'embeddings', 'navigate timeout');
    expect(mocks.mockFindSimilarRuns).toHaveBeenCalledWith(fakePool, [0.1, 0.2], 3, undefined);
  });

  it('passes limit and excludeRunId when provided', async () => {
    mocks.mockEmbedText.mockResolvedValue([0.9]);
    await retrieveSimilarRuns(fakeClient, fakePool, {
      summaryText: 'click failed',
      deployment: 'embeddings',
      limit: 5,
      excludeRunId: 'run-exclude',
    });
    expect(mocks.mockFindSimilarRuns).toHaveBeenCalledWith(fakePool, [0.9], 5, 'run-exclude');
  });

  it('returns mapped results from findSimilarRuns', async () => {
    const rows: SimilarRun[] = [
      { run_id: 'r1', summary_text: 'click failed', distance: 0.1 },
      { run_id: 'r2', summary_text: 'timeout', distance: 0.25 },
    ];
    mocks.mockFindSimilarRuns.mockResolvedValue(rows);
    const result = await retrieveSimilarRuns(fakeClient, fakePool, {
      summaryText: 'some error',
      deployment: 'embeddings',
    });
    expect(result).toEqual(rows);
  });
});

describe('formatSimilarRunsContext', () => {
  it('returns empty string for empty array', () => {
    expect(formatSimilarRunsContext([])).toBe('');
  });

  it('formats single run with similarity score', () => {
    const runs: SimilarRun[] = [{ run_id: 'r1', summary_text: 'click failed', distance: 0.12 }];
    const ctx = formatSimilarRunsContext(runs);
    expect(ctx).toContain('Similar past failures');
    expect(ctx).toContain('click failed');
    expect(ctx).toContain('0.88'); // 1 - 0.12
    expect(ctx).toContain('1.');
  });

  it('numbers multiple runs sequentially', () => {
    const runs: SimilarRun[] = [
      { run_id: 'r1', summary_text: 'error a', distance: 0.1 },
      { run_id: 'r2', summary_text: 'error b', distance: 0.2 },
      { run_id: 'r3', summary_text: 'error c', distance: 0.3 },
    ];
    const ctx = formatSimilarRunsContext(runs);
    expect(ctx).toContain('1.');
    expect(ctx).toContain('2.');
    expect(ctx).toContain('3.');
    expect(ctx).toContain('error a');
    expect(ctx).toContain('error b');
    expect(ctx).toContain('error c');
  });
});
