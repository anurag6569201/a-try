import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPlanSuggester } from '../prompts/planSuggester.js';
import { planSuggesterFixtures } from '../fixtures/planSuggesterFixtures.js';

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
const opts = { runId: 'run-regression', promptName: 'plan_suggester' };

beforeEach(() => vi.clearAllMocks());

describe('runPlanSuggester — regression fixtures', () => {
  for (const fixture of planSuggesterFixtures) {
    it(`${fixture.id}: ${fixture.input.changedFiles.slice(0, 2).join(', ')}`, async () => {
      mocks.mockChatComplete.mockResolvedValue({
        content: JSON.stringify(fixture.mockOutput),
        inputTokens: 200,
        outputTokens: 80,
      });

      const result = await runPlanSuggester(fakeClient, fakePool, 'plan-suggester', fixture.input, opts);

      const count = fixture.expect.suggestionCount;
      if (typeof count === 'number') {
        expect(result.suggestions).toHaveLength(count);
      } else {
        expect(result.suggestions.length).toBeGreaterThanOrEqual(count.min);
        expect(result.suggestions.length).toBeLessThanOrEqual(count.max);
      }

      if (fixture.expect.empty) {
        expect(result.suggestions).toEqual([]);
      }

      if (fixture.expect.firstRouteContains) {
        const firstRoute = result.suggestions[0]?.route ?? '';
        expect(firstRoute.toLowerCase()).toContain(fixture.expect.firstRouteContains.toLowerCase());
      }

      if (fixture.expect.allRoutesPresent) {
        const routes = result.suggestions.map((s) => s.route);
        for (const expected of fixture.expect.allRoutesPresent) {
          expect(routes.some((r) => r.includes(expected))).toBe(true);
        }
      }
    });
  }
});
