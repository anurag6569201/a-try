import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepType } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockRunPlanNormalizer = vi.fn();
  const mockCreateAzureOpenAIClient = vi.fn().mockReturnValue({});
  return { mockRunPlanNormalizer, mockCreateAzureOpenAIClient };
});

vi.mock('@preview-qa/ai', () => ({
  createAzureOpenAIClient: mocks.mockCreateAzureOpenAIClient,
  runPlanNormalizer: mocks.mockRunPlanNormalizer,
}));

import { normalizeSteps } from '../normalizer.js';

const fakePool = {} as Parameters<typeof normalizeSteps>[0];
const fakeAiConfig = {
  endpoint: 'https://example.openai.azure.com',
  apiKey: 'key',
  deployments: { planNormalizer: 'gpt-4o', failureSummarizer: 'gpt-4o', riskClassifier: 'gpt-4o', planSuggester: 'plan-suggester' },
};
const runId = 'run-1';
const previewUrl = 'https://preview.example.com';

beforeEach(() => vi.clearAllMocks());

describe('normalizeSteps', () => {
  it('passes through navigate steps without calling AI', async () => {
    const steps = [{ type: StepType.Navigate, url: previewUrl }] as never[];
    const result = await normalizeSteps(fakePool, fakeAiConfig, runId, steps, previewUrl);
    expect(mocks.mockRunPlanNormalizer).not.toHaveBeenCalled();
    expect(result).toEqual(steps);
  });

  it('passes through steps with CSS selectors without calling AI', async () => {
    const steps = [
      { type: StepType.Click, selector: '#submit-btn' },
      { type: StepType.Fill, selector: '.email-input', value: 'test@example.com' },
    ] as never[];
    const result = await normalizeSteps(fakePool, fakeAiConfig, runId, steps, previewUrl);
    expect(mocks.mockRunPlanNormalizer).not.toHaveBeenCalled();
    expect(result).toEqual(steps);
  });

  it('calls AI for fill step with natural language selector', async () => {
    mocks.mockRunPlanNormalizer.mockResolvedValue({
      selector: '[name="email"]',
      reasoning: 'Email field by name',
    });
    const steps = [
      { type: StepType.Fill, selector: 'the email input field', value: 'user@example.com' },
    ] as never[];
    const result = await normalizeSteps(fakePool, fakeAiConfig, runId, steps, previewUrl);
    expect(mocks.mockRunPlanNormalizer).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({ selector: '[name="email"]' });
  });

  it('falls back to original selector when AI call fails', async () => {
    mocks.mockRunPlanNormalizer.mockRejectedValue(new Error('AI unavailable'));
    const steps = [
      { type: StepType.Click, selector: 'the login button' },
    ] as never[];
    const result = await normalizeSteps(fakePool, fakeAiConfig, runId, steps, previewUrl);
    expect(result[0]).toMatchObject({ selector: 'the login button' });
  });

  it('passes through screenshot steps without AI call', async () => {
    const steps = [{ type: StepType.Screenshot, label: 'home' }] as never[];
    const result = await normalizeSteps(fakePool, fakeAiConfig, runId, steps, previewUrl);
    expect(mocks.mockRunPlanNormalizer).not.toHaveBeenCalled();
    expect(result).toEqual(steps);
  });
});
