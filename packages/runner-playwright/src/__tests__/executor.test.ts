import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StepType } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockGoto = vi.fn().mockResolvedValue(null);
  const mockTitle = vi.fn().mockResolvedValue('Test Page');
  const mockScreenshot = vi.fn().mockResolvedValue(Buffer.alloc(0));
  const mockLocatorWaitFor = vi.fn().mockResolvedValue(undefined);
  const mockLocatorFill = vi.fn().mockResolvedValue(undefined);
  const mockLocatorClick = vi.fn().mockResolvedValue(undefined);
  const mockRequestGet = vi.fn().mockResolvedValue({ ok: () => true, status: () => 200 });
  const mockTracingStart = vi.fn().mockResolvedValue(undefined);
  const mockTracingStop = vi.fn().mockResolvedValue(undefined);
  const mockContextClose = vi.fn().mockResolvedValue(undefined);
  const mockBrowserClose = vi.fn().mockResolvedValue(undefined);

  const mockPage = {
    goto: mockGoto,
    title: mockTitle,
    screenshot: mockScreenshot,
    locator: vi.fn().mockReturnValue({
      waitFor: mockLocatorWaitFor,
      fill: mockLocatorFill,
      click: mockLocatorClick,
    }),
    request: { get: mockRequestGet },
    url: vi.fn().mockReturnValue('https://preview.example.com'),
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    tracing: { start: mockTracingStart, stop: mockTracingStop },
    close: mockContextClose,
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: mockBrowserClose,
  };

  return {
    mockGoto,
    mockTitle,
    mockScreenshot,
    mockLocatorWaitFor,
    mockLocatorFill,
    mockLocatorClick,
    mockRequestGet,
    mockTracingStart,
    mockTracingStop,
    mockContextClose,
    mockBrowserClose,
    mockPage,
    mockContext,
    mockBrowser,
  };
});

vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue(mocks.mockBrowser),
  },
}));

vi.mock('fs', () => ({
  default: { mkdirSync: vi.fn() },
  mkdirSync: vi.fn(),
}));

import { executeRun } from '../executor.js';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockGoto.mockResolvedValue(null);
  mocks.mockTitle.mockResolvedValue('Test Page');
  mocks.mockLocatorWaitFor.mockResolvedValue(undefined);
  mocks.mockLocatorFill.mockResolvedValue(undefined);
  mocks.mockLocatorClick.mockResolvedValue(undefined);
  mocks.mockRequestGet.mockResolvedValue({ ok: () => true, status: () => 200 });
  mocks.mockTracingStart.mockResolvedValue(undefined);
  mocks.mockTracingStop.mockResolvedValue(undefined);
  mocks.mockScreenshot.mockResolvedValue(Buffer.alloc(0));
  mocks.mockContextClose.mockResolvedValue(undefined);
  mocks.mockBrowserClose.mockResolvedValue(undefined);
  mocks.mockContext.newPage.mockResolvedValue(mocks.mockPage);
  mocks.mockBrowser.newContext.mockResolvedValue(mocks.mockContext);
  mocks.mockPage.locator.mockReturnValue({
    waitFor: mocks.mockLocatorWaitFor,
    fill: mocks.mockLocatorFill,
    click: mocks.mockLocatorClick,
  });
});

describe('executeRun', () => {
  it('returns pass when all steps succeed', async () => {
    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [
        { type: StepType.Navigate, url: 'https://preview.example.com' },
        { type: StepType.AssertTitle, value: 'Test' },
      ],
    });

    expect(result.outcome).toBe('pass');
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]?.ok).toBe(true);
    expect(result.steps[1]?.ok).toBe(true);
  });

  it('returns fail and stops on first failing step', async () => {
    mocks.mockTitle.mockResolvedValue('Wrong Title');

    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [
        { type: StepType.Navigate, url: 'https://preview.example.com' },
        { type: StepType.AssertTitle, value: 'Expected Title' },
        { type: StepType.Screenshot, label: 'final' },
      ],
    });

    expect(result.outcome).toBe('fail');
    expect(result.steps).toHaveLength(2); // Screenshot step never runs
    expect(result.steps[1]?.ok).toBe(false);
    expect(result.steps[1]?.error).toMatch(/Expected Title/);
  });

  it('captures a screenshot step with path', async () => {
    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [
        { type: StepType.Navigate, url: 'https://preview.example.com' },
        { type: StepType.Screenshot, label: 'home' },
      ],
    });

    expect(result.outcome).toBe('pass');
    const screenshotStep = result.steps[1];
    expect(screenshotStep?.screenshotPath).toContain('home.png');
  });

  it('fails assert_200 on non-ok response', async () => {
    mocks.mockRequestGet.mockResolvedValue({ ok: () => false, status: () => 404 });

    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [
        { type: StepType.Navigate, url: 'https://preview.example.com' },
        { type: StepType.Assert200, url: 'https://preview.example.com/api/health' },
      ],
    });

    expect(result.outcome).toBe('fail');
    expect(result.steps[1]?.error).toMatch(/404/);
  });

  it('executes fill and click steps', async () => {
    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [
        { type: StepType.Navigate, url: 'https://preview.example.com' },
        { type: StepType.Fill, selector: '#email', value: 'user@example.com' },
        { type: StepType.Click, selector: '#submit' },
      ],
    });

    expect(result.outcome).toBe('pass');
    expect(mocks.mockLocatorFill).toHaveBeenCalledWith('user@example.com');
    expect(mocks.mockLocatorClick).toHaveBeenCalled();
  });

  it('always closes browser even when a step throws', async () => {
    mocks.mockGoto.mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED'));

    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [{ type: StepType.Navigate, url: 'https://preview.example.com' }],
    });

    expect(result.outcome).toBe('fail');
    expect(mocks.mockBrowserClose).toHaveBeenCalled();
    expect(mocks.mockContextClose).toHaveBeenCalled();
  });

  it('attaches trace path on failure', async () => {
    mocks.mockTitle.mockResolvedValue('Wrong');

    const result = await executeRun({
      previewUrl: 'https://preview.example.com',
      outputDir: '/tmp/test-run',
      steps: [
        { type: StepType.Navigate, url: 'https://preview.example.com' },
        { type: StepType.AssertTitle, value: 'Expected' },
      ],
    });

    expect(result.outcome).toBe('fail');
    expect(result.tracePath).toContain('trace.zip');
    expect(mocks.mockTracingStop).toHaveBeenCalledWith({ path: expect.stringContaining('trace.zip') as string });
  });
});
