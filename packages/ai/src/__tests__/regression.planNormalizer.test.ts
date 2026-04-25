import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPlanNormalizer } from '../prompts/planNormalizer.js';
import { planNormalizerFixtures } from '../fixtures/planNormalizerFixtures.js';

const mocks = vi.hoisted(() => {
  const mockChatComplete = vi.fn();
  const mockLogModelTrace = vi.fn().mockResolvedValue(undefined);
  return { mockChatComplete, mockLogModelTrace };
});

vi.mock('../client.js', () => ({
  chatComplete: mocks.mockChatComplete,
  logModelTrace: mocks.mockLogModelTrace,
}));

const fakeClient = {} as Parameters<typeof runPlanNormalizer>[0];
const fakePool = {} as Parameters<typeof runPlanNormalizer>[1];
const opts = { runId: 'run-regression', promptName: 'plan_normalizer' };

beforeEach(() => vi.clearAllMocks());

describe('runPlanNormalizer — regression fixtures', () => {
  for (const fixture of planNormalizerFixtures) {
    it(`${fixture.id}: ${fixture.input.stepType} — ${fixture.input.rawInstruction}`, async () => {
      mocks.mockChatComplete.mockResolvedValue({
        content: JSON.stringify(fixture.mockOutput),
        inputTokens: 100,
        outputTokens: 50,
      });

      const result = await runPlanNormalizer(fakeClient, fakePool, 'gpt-4o', fixture.input, opts);

      expect(result.reasoning).toBeTruthy();

      if (fixture.expect.hasSelector) {
        expect(result.selector).toBeTruthy();
        if (fixture.expect.selectorContains) {
          expect(result.selector?.toLowerCase()).toContain(fixture.expect.selectorContains.toLowerCase());
        }
      }

      if (fixture.expect.hasUrl) {
        expect(result.url).toBeTruthy();
        if (fixture.expect.urlContains) {
          expect(result.url?.toLowerCase()).toContain(fixture.expect.urlContains.toLowerCase());
        }
      }

      if (fixture.expect.hasValue) {
        expect(result.value).toBeTruthy();
      }
    });
  }
});
