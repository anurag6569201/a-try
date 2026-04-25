import { FailureCategory } from '@preview-qa/domain';
import type { RiskClassifierInput, RiskClassifierOutput } from '../types.js';

export interface RiskClassifierFixture {
  id: string;
  input: RiskClassifierInput;
  expect: {
    category: FailureCategory;
    minConfidence: 'high' | 'medium' | 'low';
  };
  mockOutput: RiskClassifierOutput;
}

const confidenceOrder = { high: 2, medium: 1, low: 0 } as const;
export function meetsMinConfidence(actual: 'high' | 'medium' | 'low', min: 'high' | 'medium' | 'low'): boolean {
  return confidenceOrder[actual] >= confidenceOrder[min];
}

export const riskClassifierFixtures: RiskClassifierFixture[] = [
  {
    id: 'RC-01',
    input: { stepType: 'assert_200', error: 'Expected 200, got 404', failureSummary: 'Route /about returned 404.' },
    expect: { category: FailureCategory.ProductBug, minConfidence: 'high' },
    mockOutput: { category: FailureCategory.ProductBug, confidence: 'high', reasoning: 'Missing route is a product defect.' },
  },
  {
    id: 'RC-02',
    input: { stepType: 'assert_200', error: 'Expected 200, got 500', failureSummary: 'Server threw an unhandled exception.' },
    expect: { category: FailureCategory.ProductBug, minConfidence: 'high' },
    mockOutput: { category: FailureCategory.ProductBug, confidence: 'high', reasoning: 'Server error indicates a product defect.' },
  },
  {
    id: 'RC-03',
    input: { stepType: 'click', error: 'Element not found: #login-btn', failureSummary: 'Button with ID login-btn not found.' },
    expect: { category: FailureCategory.TestBug, minConfidence: 'high' },
    mockOutput: { category: FailureCategory.TestBug, confidence: 'high', reasoning: 'Selector references a non-existent ID — test is wrong.' },
  },
  {
    id: 'RC-04',
    input: { stepType: 'fill', error: 'Element not found: .email-field', failureSummary: 'Email input with class email-field not present.' },
    expect: { category: FailureCategory.TestBug, minConfidence: 'medium' },
    mockOutput: { category: FailureCategory.TestBug, confidence: 'medium', reasoning: 'Class selector may be outdated.' },
  },
  {
    id: 'RC-05',
    input: { stepType: 'navigate', error: 'net::ERR_CONNECTION_REFUSED', failureSummary: 'Preview URL was unreachable.' },
    expect: { category: FailureCategory.EnvironmentIssue, minConfidence: 'high' },
    mockOutput: { category: FailureCategory.EnvironmentIssue, confidence: 'high', reasoning: 'Connection refused — deployment not running.' },
  },
  {
    id: 'RC-06',
    input: { stepType: 'navigate', error: 'net::ERR_CONNECTION_TIMED_OUT', failureSummary: 'Preview did not respond in time.' },
    expect: { category: FailureCategory.EnvironmentIssue, minConfidence: 'medium' },
    mockOutput: { category: FailureCategory.EnvironmentIssue, confidence: 'medium', reasoning: 'Timeout suggests deployment cold start or overload.' },
  },
  {
    id: 'RC-07',
    input: { stepType: 'assert_visible', error: 'Timeout 10000ms exceeded', failureSummary: 'Element was not visible within timeout.' },
    expect: { category: FailureCategory.Flaky, minConfidence: 'medium' },
    mockOutput: { category: FailureCategory.Flaky, confidence: 'medium', reasoning: 'Timing-sensitive assertion suggests a race condition.' },
  },
  {
    id: 'RC-08',
    input: { stepType: 'assert_200', error: 'Expected 200, got 503', failureSummary: 'Service unavailable — possible cold start.' },
    expect: { category: FailureCategory.EnvironmentIssue, minConfidence: 'medium' },
    mockOutput: { category: FailureCategory.EnvironmentIssue, confidence: 'medium', reasoning: '503 from preview is an environment issue.' },
  },
  {
    id: 'RC-09',
    input: { stepType: 'assert_title', error: 'Title "" does not contain "Dashboard"', failureSummary: 'Page title was empty.' },
    expect: { category: FailureCategory.ProductBug, minConfidence: 'medium' },
    mockOutput: { category: FailureCategory.ProductBug, confidence: 'medium', reasoning: 'Empty title suggests the page failed to render correctly.' },
  },
  {
    id: 'RC-10',
    input: { stepType: 'click', error: 'Unexpected error: undefined', failureSummary: 'An unknown error occurred during the click.' },
    expect: { category: FailureCategory.NeedsClarification, minConfidence: 'low' },
    mockOutput: { category: FailureCategory.NeedsClarification, confidence: 'low', reasoning: 'Insufficient context to classify.' },
  },
];
