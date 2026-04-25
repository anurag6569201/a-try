import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFailureSummarizer } from '../prompts/failureSummarizer.js';
import { failureSummarizerFixtures } from '../fixtures/failureSummarizerFixtures.js';

const mocks = vi.hoisted(() => {
  const mockChatComplete = vi.fn();
  const mockLogModelTrace = vi.fn().mockResolvedValue(undefined);
  return { mockChatComplete, mockLogModelTrace };
});

vi.mock('../client.js', () => ({
  chatComplete: mocks.mockChatComplete,
  logModelTrace: mocks.mockLogModelTrace,
}));

const fakeClient = {} as Parameters<typeof runFailureSummarizer>[0];
const fakePool = {} as Parameters<typeof runFailureSummarizer>[1];
const opts = { runId: 'run-regression', promptName: 'failure_summarizer' };

beforeEach(() => vi.clearAllMocks());

describe('runFailureSummarizer — regression fixtures', () => {
  for (const fixture of failureSummarizerFixtures) {
    it(`${fixture.id}: ${fixture.input.stepType} — ${fixture.input.error.slice(0, 60)}`, async () => {
      mocks.mockChatComplete.mockResolvedValue({
        content: JSON.stringify(fixture.mockOutput),
        inputTokens: 100,
        outputTokens: 50,
      });

      const result = await runFailureSummarizer(fakeClient, fakePool, 'gpt-4o', fixture.input, opts);

      expect(result.summary).toBeTruthy();

      for (const token of fixture.expect.summaryContains) {
        expect(result.summary.toLowerCase()).toContain(token.toLowerCase());
      }

      if (fixture.expect.hasSuggestedFix === true) {
        expect(result.suggestedFix).toBeTruthy();
      } else if (fixture.expect.hasSuggestedFix === false) {
        expect(result.suggestedFix).toBeUndefined();
      }
    });
  }
});
