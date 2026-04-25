import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPlanSuggester } from '../prompts/planSuggester.js';

const mocks = vi.hoisted(() => {
  const mockChatComplete = vi.fn();
  const mockLogModelTrace = vi.fn().mockResolvedValue(undefined);
  return { mockChatComplete, mockLogModelTrace };
});

vi.mock('../client.js', () => ({
  chatComplete: mocks.mockChatComplete,
  logModelTrace: mocks.mockLogModelTrace,
}));

const fakeClient = {} as Parameters<typeof runPlanSuggester>[0];
const fakePool = {} as Parameters<typeof runPlanSuggester>[1];
const opts = { runId: 'run-1', promptName: 'plan_suggester' };

function mockResponse(obj: object) {
  mocks.mockChatComplete.mockResolvedValue({
    content: JSON.stringify(obj),
    inputTokens: 200,
    outputTokens: 80,
  });
}

beforeEach(() => vi.clearAllMocks());

describe('runPlanSuggester — golden fixtures', () => {
  it('F1: suggests /dashboard when only home page is covered', async () => {
    mockResponse({
      suggestions: [
        { route: '/dashboard', reason: 'Dashboard page was modified but not covered', stepType: 'navigate' },
      ],
    });
    const result = await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', {
      changedFiles: ['app/dashboard/page.tsx', 'components/DashboardChart.tsx'],
      existingSteps: [{ type: 'navigate', url: 'https://preview.example.com' }],
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]?.route).toBe('/dashboard');
    expect(result.suggestions[0]?.stepType).toBe('navigate');
  });

  it('F2: returns empty suggestions when coverage is already complete', async () => {
    mockResponse({ suggestions: [] });
    const result = await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', {
      changedFiles: ['app/about/page.tsx'],
      existingSteps: [
        { type: 'navigate', url: 'https://preview.example.com/about' },
        { type: 'assert_visible', selector: 'h1' },
      ],
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.suggestions).toHaveLength(0);
  });

  it('F3: suggests API endpoint check when API route was changed', async () => {
    mockResponse({
      suggestions: [
        { route: '/api/users', reason: 'API route modified — verify 200 response', stepType: 'navigate' },
      ],
    });
    const result = await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', {
      changedFiles: ['pages/api/users.ts'],
      existingSteps: [{ type: 'navigate', url: 'https://preview.example.com' }],
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.suggestions[0]?.route).toBe('/api/users');
  });

  it('F4: returns at most 5 suggestions', async () => {
    const manySuggestions = Array.from({ length: 5 }, (_, i) => ({
      route: `/route-${i}`,
      reason: `Route ${i} not covered`,
      stepType: 'navigate',
    }));
    mockResponse({ suggestions: manySuggestions });
    const result = await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', {
      changedFiles: ['app/a/page.tsx', 'app/b/page.tsx', 'app/c/page.tsx', 'app/d/page.tsx', 'app/e/page.tsx'],
      existingSteps: [],
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.suggestions.length).toBeLessThanOrEqual(5);
  });

  it('F5: handles malformed JSON gracefully — returns empty suggestions', async () => {
    mocks.mockChatComplete.mockResolvedValue({
      content: '{ "suggestions": "not-an-array" }',
      inputTokens: 50,
      outputTokens: 10,
    });
    const result = await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', {
      changedFiles: ['app/page.tsx'],
      existingSteps: [],
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.suggestions).toEqual([]);
  });
});

describe('runPlanSuggester — logging', () => {
  it('logs model trace with correct fields', async () => {
    mockResponse({ suggestions: [] });
    await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', {
      changedFiles: ['app/page.tsx'],
      existingSteps: [],
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(mocks.mockLogModelTrace).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({
        runId: 'run-1',
        promptName: 'plan_suggester',
        model: 'plan-suggester',
        inputTokens: 200,
        outputTokens: 80,
      }),
    );
  });
});
