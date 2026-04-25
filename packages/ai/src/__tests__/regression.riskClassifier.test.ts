import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runRiskClassifier } from '../prompts/riskClassifier.js';
import { riskClassifierFixtures, meetsMinConfidence } from '../fixtures/riskClassifierFixtures.js';

const mocks = vi.hoisted(() => {
  const mockChatComplete = vi.fn();
  const mockLogModelTrace = vi.fn().mockResolvedValue(undefined);
  return { mockChatComplete, mockLogModelTrace };
});

vi.mock('../client.js', () => ({
  chatComplete: mocks.mockChatComplete,
  logModelTrace: mocks.mockLogModelTrace,
}));

const fakeClient = {} as Parameters<typeof runRiskClassifier>[0];
const fakePool = {} as Parameters<typeof runRiskClassifier>[1];
const opts = { runId: 'run-regression', promptName: 'risk_classifier' };

beforeEach(() => vi.clearAllMocks());

describe('runRiskClassifier — regression fixtures', () => {
  for (const fixture of riskClassifierFixtures) {
    it(`${fixture.id}: ${fixture.input.stepType} → ${fixture.expect.category}`, async () => {
      mocks.mockChatComplete.mockResolvedValue({
        content: JSON.stringify(fixture.mockOutput),
        inputTokens: 80,
        outputTokens: 30,
      });

      const result = await runRiskClassifier(fakeClient, fakePool, 'gpt-4o', fixture.input, opts);

      expect(result.category).toBe(fixture.expect.category);
      expect(meetsMinConfidence(result.confidence, fixture.expect.minConfidence)).toBe(true);
      expect(result.reasoning).toBeTruthy();
    });
  }
});
