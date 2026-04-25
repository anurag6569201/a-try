import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FailureCategory } from '@preview-qa/domain';
import { runRiskClassifier } from '../prompts/riskClassifier.js';

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
const opts = { runId: 'run-1', promptName: 'risk_classifier' };

function mockResponse(obj: object) {
  mocks.mockChatComplete.mockResolvedValue({
    content: JSON.stringify(obj),
    inputTokens: 80,
    outputTokens: 30,
  });
}

beforeEach(() => vi.clearAllMocks());

describe('runRiskClassifier', () => {
  it('F1: classifies a 404 response as product_bug', async () => {
    mockResponse({
      category: FailureCategory.ProductBug,
      confidence: 'high',
      reasoning: 'The route returned 404 indicating a missing page in the product.',
    });
    const result = await runRiskClassifier(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'assert_200',
      error: 'Expected 200, got 404',
      failureSummary: 'The route /about returned 404.',
    }, opts);
    expect(result.category).toBe(FailureCategory.ProductBug);
    expect(result.confidence).toBe('high');
    expect(result.reasoning).toBeTruthy();
  });

  it('F2: classifies a bad selector as test_bug', async () => {
    mockResponse({
      category: FailureCategory.TestBug,
      confidence: 'high',
      reasoning: 'The selector #login-btn does not match any element — the test references a wrong ID.',
    });
    const result = await runRiskClassifier(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'click',
      error: 'Element not found: #login-btn',
      failureSummary: 'The button with ID login-btn was not found on the page.',
    }, opts);
    expect(result.category).toBe(FailureCategory.TestBug);
  });

  it('F3: classifies a connection error as environment_issue', async () => {
    mockResponse({
      category: FailureCategory.EnvironmentIssue,
      confidence: 'high',
      reasoning: 'Connection refused indicates the preview deployment is not running.',
    });
    const result = await runRiskClassifier(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'navigate',
      error: 'net::ERR_CONNECTION_REFUSED',
      failureSummary: 'The preview URL was unreachable.',
    }, opts);
    expect(result.category).toBe(FailureCategory.EnvironmentIssue);
  });

  it('F4: classifies an intermittent timeout as flaky', async () => {
    mockResponse({
      category: FailureCategory.Flaky,
      confidence: 'medium',
      reasoning: 'Timeout on a normally stable element suggests a timing issue.',
    });
    const result = await runRiskClassifier(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'assert_visible',
      error: 'Timeout 10000ms exceeded',
      failureSummary: 'The element was not visible within the timeout.',
    }, opts);
    expect(result.category).toBe(FailureCategory.Flaky);
    expect(result.confidence).toBe('medium');
  });

  it('F5: logs trace and passes through all token counts', async () => {
    mockResponse({
      category: FailureCategory.NeedsClarification,
      confidence: 'low',
      reasoning: 'Insufficient information to classify.',
    });
    await runRiskClassifier(fakeClient, fakePool, 'gpt-4o-nano', {
      stepType: 'fill',
      error: 'Unknown error',
      failureSummary: 'An unexpected error occurred.',
    }, opts);
    expect(mocks.mockLogModelTrace).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      model: 'gpt-4o-nano',
      promptName: 'risk_classifier',
      inputTokens: 80,
      outputTokens: 30,
    }));
  });
});
