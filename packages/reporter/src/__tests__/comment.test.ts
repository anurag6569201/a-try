import { describe, it, expect } from 'vitest';
import { StepType, ArtifactKind } from '@preview-qa/domain';
import { formatPRComment, formatCheckBody } from '../comment.js';
import type { RunReport } from '../types.js';

const baseReport: RunReport = {
  runId: 'abcdef12-0000-0000-0000-000000000000',
  outcome: 'pass',
  durationMs: 4200,
  sha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  steps: [
    { type: StepType.Navigate, ok: true, durationMs: 800 },
    { type: StepType.AssertTitle, ok: true, durationMs: 50 },
    { type: StepType.Screenshot, ok: true, durationMs: 120, screenshotPath: '/tmp/home.png' },
  ],
  artifacts: [],
};

describe('formatPRComment', () => {
  it('includes pass badge for passing run', () => {
    const comment = formatPRComment(baseReport);
    expect(comment).toContain('preview--qa-pass');
    expect(comment).toContain('PASS');
  });

  it('includes fail badge for failing run', () => {
    const report: RunReport = { ...baseReport, outcome: 'fail' };
    const comment = formatPRComment(report);
    expect(comment).toContain('preview--qa-fail');
    expect(comment).toContain('FAIL');
  });

  it('includes duration in human-readable form', () => {
    const comment = formatPRComment(baseReport);
    expect(comment).toContain('4.2s');
  });

  it('shows ms for sub-second durations', () => {
    const report: RunReport = { ...baseReport, durationMs: 800 };
    const comment = formatPRComment(report);
    expect(comment).toContain('800ms');
  });

  it('includes step type and status icons in table', () => {
    const comment = formatPRComment(baseReport);
    expect(comment).toContain('navigate');
    expect(comment).toContain('assert_title');
    expect(comment).toContain('screenshot');
    expect(comment).toContain('✅');
  });

  it('shows ❌ and truncated error for failed steps', () => {
    const report: RunReport = {
      ...baseReport,
      outcome: 'fail',
      steps: [
        { type: StepType.Navigate, ok: true, durationMs: 200 },
        {
          type: StepType.AssertTitle,
          ok: false,
          durationMs: 10,
          error: 'Title "Wrong Page" does not contain "Expected"',
        },
      ],
    };
    const comment = formatPRComment(report);
    expect(comment).toContain('❌');
    expect(comment).toContain('does not contain');
  });

  it('includes preview URL when provided', () => {
    const report: RunReport = {
      ...baseReport,
      previewUrl: 'https://my-app-abc123.vercel.app',
    };
    const comment = formatPRComment(report);
    expect(comment).toContain('https://my-app-abc123.vercel.app');
  });

  it('omits preview section when no URL provided', () => {
    const comment = formatPRComment(baseReport);
    expect(comment).not.toContain('Preview:');
  });

  it('includes shortened runId and sha in footer', () => {
    const comment = formatPRComment(baseReport);
    expect(comment).toContain('abcdef12');
    expect(comment).toContain('a1b2c3d');
  });

  it('includes screenshot artifact links', () => {
    const report: RunReport = {
      ...baseReport,
      artifacts: [
        {
          kind: ArtifactKind.Screenshot,
          blobUrl: 'https://storage.blob.core.windows.net/artifacts/runs/run-1/home.png',
          filename: 'home.png',
        },
      ],
    };
    const comment = formatPRComment(report);
    expect(comment).toContain('Screenshots');
    expect(comment).toContain('home.png');
  });

  it('includes trace artifact links', () => {
    const report: RunReport = {
      ...baseReport,
      artifacts: [
        {
          kind: ArtifactKind.Trace,
          blobUrl: 'https://storage.blob.core.windows.net/artifacts/runs/run-1/trace.zip',
          filename: 'trace.zip',
        },
      ],
    };
    const comment = formatPRComment(report);
    expect(comment).toContain('Traces');
    expect(comment).toContain('trace.zip');
  });
});

describe('formatCheckBody', () => {
  it('includes step table', () => {
    const body = formatCheckBody(baseReport);
    expect(body).toContain('navigate');
    expect(body).toContain('screenshot');
  });

  it('includes Failures section for failed steps', () => {
    const report: RunReport = {
      ...baseReport,
      outcome: 'fail',
      steps: [
        { type: StepType.Navigate, ok: true, durationMs: 200 },
        {
          type: StepType.Assert200,
          ok: false,
          durationMs: 10,
          error: 'Expected 200, got 404',
        },
      ],
    };
    const body = formatCheckBody(report);
    expect(body).toContain('Failures');
    expect(body).toContain('Expected 200, got 404');
  });

  it('omits Failures section when all steps pass', () => {
    const body = formatCheckBody(baseReport);
    expect(body).not.toContain('Failures');
  });
});
