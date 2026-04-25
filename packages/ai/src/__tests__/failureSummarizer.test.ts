import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFailureSummarizer } from '../prompts/failureSummarizer.js';

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
const opts = { runId: 'run-1', promptName: 'failure_summarizer' };

function mockResponse(obj: object) {
  mocks.mockChatComplete.mockResolvedValue({
    content: JSON.stringify(obj),
    inputTokens: 120,
    outputTokens: 60,
  });
}

beforeEach(() => vi.clearAllMocks());

describe('runFailureSummarizer', () => {
  it('F1: summarizes a 404 assert_200 failure', async () => {
    mockResponse({
      summary: 'The page returned a 404 Not Found response. The route /about does not exist on the preview.',
      suggestedFix: 'Ensure the /about route is deployed and not behind a feature flag.',
    });
    const result = await runFailureSummarizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'assert_200',
      error: 'Expected 200, got 404',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.summary).toContain('404');
    expect(result.suggestedFix).toBeTruthy();
  });

  it('F2: summarizes a title mismatch failure', async () => {
    mockResponse({
      summary: 'The page title "Wrong Page" does not contain the expected text "Dashboard".',
    });
    const result = await runFailureSummarizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'assert_title',
      error: 'Title "Wrong Page" does not contain "Dashboard"',
      previewUrl: 'https://preview.example.com',
      pageTitle: 'Wrong Page',
    }, opts);
    expect(result.summary).toContain('Dashboard');
    expect(result).not.toHaveProperty('suggestedFix'); // optional, not present
  });

  it('F3: summarizes a missing element failure', async () => {
    mockResponse({
      summary: 'The selector .login-form was not visible on the page within the timeout.',
      suggestedFix: 'Check if the login form is conditionally rendered and ensure it appears on load.',
    });
    const result = await runFailureSummarizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'assert_visible',
      error: 'Timeout 10000ms exceeded waiting for locator(".login-form") to be visible',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.summary).toContain('login-form');
  });

  it('F4: summarizes a navigation timeout failure', async () => {
    mockResponse({
      summary: 'Navigation to the preview URL timed out. The page did not become interactive within the limit.',
    });
    const result = await runFailureSummarizer(fakeClient, fakePool, 'gpt-4o', {
      stepType: 'navigate',
      error: 'net::ERR_CONNECTION_TIMED_OUT',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(result.summary).toBeTruthy();
  });

  it('F5: logs trace with correct deployment name', async () => {
    mockResponse({ summary: 'Fill step failed: element not found.' });
    await runFailureSummarizer(fakeClient, fakePool, 'gpt-4o-mini-deploy', {
      stepType: 'fill',
      error: 'Element not found: #email',
      previewUrl: 'https://preview.example.com',
    }, opts);
    expect(mocks.mockLogModelTrace).toHaveBeenCalledWith(fakePool, expect.objectContaining({
      model: 'gpt-4o-mini-deploy',
      promptName: 'failure_summarizer',
    }));
  });
});
