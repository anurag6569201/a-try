import type { FailureSummarizerInput, FailureSummarizerOutput } from '../types.js';

export interface FailureSummarizerFixture {
  id: string;
  input: FailureSummarizerInput;
  expect: {
    summaryContains: string[];
    hasSuggestedFix?: boolean;
  };
  mockOutput: FailureSummarizerOutput;
}

export const failureSummarizerFixtures: FailureSummarizerFixture[] = [
  {
    id: 'FS-01',
    input: { stepType: 'assert_200', error: 'Expected 200, got 404', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['404'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The route returned a 404 Not Found response.',
      suggestedFix: 'Ensure the route is deployed and not behind a feature flag.',
    },
  },
  {
    id: 'FS-02',
    input: { stepType: 'assert_200', error: 'Expected 200, got 500', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['500'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The server returned a 500 Internal Server Error.',
      suggestedFix: 'Check server logs for an unhandled exception in the route handler.',
    },
  },
  {
    id: 'FS-03',
    input: { stepType: 'assert_title', error: 'Title "Wrong Page" does not contain "Dashboard"', previewUrl: 'https://preview.example.com', pageTitle: 'Wrong Page' },
    expect: { summaryContains: ['Dashboard', 'Wrong Page'], hasSuggestedFix: false },
    mockOutput: { summary: 'The page title "Wrong Page" does not contain the expected text "Dashboard".' },
  },
  {
    id: 'FS-04',
    input: { stepType: 'assert_visible', error: 'Timeout 10000ms exceeded waiting for locator(".login-form") to be visible', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['login-form', 'visible'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The selector .login-form was not visible within the timeout.',
      suggestedFix: 'Check if the login form is conditionally rendered.',
    },
  },
  {
    id: 'FS-05',
    input: { stepType: 'navigate', error: 'net::ERR_CONNECTION_TIMED_OUT', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['timed out', 'preview'], hasSuggestedFix: false },
    mockOutput: { summary: 'Navigation timed out — the preview URL did not respond within the limit.' },
  },
  {
    id: 'FS-06',
    input: { stepType: 'click', error: 'Element not found: #submit-btn', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['submit-btn', 'not found'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The element with ID submit-btn was not found on the page.',
      suggestedFix: 'Verify the button ID matches the deployed markup.',
    },
  },
  {
    id: 'FS-07',
    input: { stepType: 'fill', error: 'Element not interactable: [name="email"]', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['email', 'interactable'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The email input field was found but not interactable (possibly hidden or disabled).',
      suggestedFix: 'Ensure the input is visible and enabled before the fill step.',
    },
  },
  {
    id: 'FS-08',
    input: { stepType: 'assert_not_visible', error: 'Expected element [data-testid="error-banner"] to be hidden, but it was visible', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['error-banner', 'visible'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The error banner [data-testid="error-banner"] was visible when it should have been hidden.',
      suggestedFix: 'Check the condition that controls visibility of the error banner.',
    },
  },
  {
    id: 'FS-09',
    input: { stepType: 'navigate', error: 'net::ERR_CONNECTION_REFUSED', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['refused', 'preview'], hasSuggestedFix: false },
    mockOutput: { summary: 'The connection to the preview URL was refused — the deployment may not be running.' },
  },
  {
    id: 'FS-10',
    input: { stepType: 'assert_200', error: 'Expected 200, got 503', previewUrl: 'https://preview.example.com' },
    expect: { summaryContains: ['503'], hasSuggestedFix: true },
    mockOutput: {
      summary: 'The server returned a 503 Service Unavailable response.',
      suggestedFix: 'The preview deployment may be overloaded or still cold-starting. Try rerunning.',
    },
  },
];
