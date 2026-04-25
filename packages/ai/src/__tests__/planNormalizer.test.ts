import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPlanNormalizer } from '../prompts/planNormalizer.js';

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
const opts = { runId: 'run-1', promptName: 'plan_normalizer' };

function mockResponse(obj: object) {
  mocks.mockChatComplete.mockResolvedValue({
    content: JSON.stringify(obj),
    inputTokens: 100,
    outputTokens: 50,
  });
}

beforeEach(() => vi.clearAllMocks());

describe('runPlanNormalizer', () => {
  it('F1: normalizes a fill step with aria selector', async () => {
    mockResponse({ selector: '[name="email"]', reasoning: 'Email input by name attribute' });
    const result = await runPlanNormalizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'fill',
      rawInstruction: 'type email into the email field',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.selector).toBe('[name="email"]');
    expect(result.reasoning).toBeTruthy();
  });

  it('F2: normalizes a click step with button selector', async () => {
    mockResponse({ selector: 'button[type="submit"]', reasoning: 'Submit button by type' });
    const result = await runPlanNormalizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'click',
      rawInstruction: 'click the submit button',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.selector).toBe('button[type="submit"]');
  });

  it('F3: normalizes a navigate step to absolute URL', async () => {
    mockResponse({ url: 'https://preview.example.com/dashboard', reasoning: 'Navigate to dashboard' });
    const result = await runPlanNormalizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'navigate',
      rawInstruction: 'go to the dashboard page',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.url).toBe('https://preview.example.com/dashboard');
  });

  it('F4: normalizes an assert_visible step with semantic selector', async () => {
    mockResponse({ selector: '.hero-banner', reasoning: 'Hero banner by class' });
    const result = await runPlanNormalizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'assert_visible',
      rawInstruction: 'check that the hero banner is shown',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.selector).toBe('.hero-banner');
  });

  it('F5: logs model trace to DB with correct fields', async () => {
    mockResponse({ value: 'My App', reasoning: 'Page title contains app name' });
    await runPlanNormalizer(fakeClient, fakePool, 'gpt-4o-custom', {
      stepType: 'assert_title',
      rawInstruction: 'verify the page title includes My App',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(mocks.mockLogModelTrace).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      runId: 'run-1',
      promptName: 'plan_normalizer',
      model: 'gpt-4o-custom',
      inputTokens: 100,
      outputTokens: 50,
    }));
  });
});
