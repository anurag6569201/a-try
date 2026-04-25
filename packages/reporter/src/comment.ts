import { ArtifactKind, FailureCategory } from '@preview-qa/domain';
import type { RunReport } from './types.js';
import { redactSecrets } from './redact.js';

const PASS_BADGE = '![pass](https://img.shields.io/badge/preview--qa-pass-brightgreen)';
const FAIL_BADGE = '![fail](https://img.shields.io/badge/preview--qa-fail-red)';

function badge(outcome: 'pass' | 'fail'): string {
  return outcome === 'pass' ? PASS_BADGE : FAIL_BADGE;
}

function durationLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function stepIcon(ok: boolean): string {
  return ok ? '✅' : '❌';
}

function stepTable(report: RunReport): string {
  const rows = report.steps.map((s, i) => {
    const icon = stepIcon(s.ok);
    const dur = durationLabel(s.durationMs);
    const error = s.error ? ` — \`${s.error.slice(0, 120)}\`` : '';
    const screenshot = s.screenshotPath
      ? ` [📸](${screenshotBlobUrl(report, i)})`
      : '';
    return `| ${icon} | \`${s.type}\` | ${dur}${error}${screenshot} |`;
  });

  return [
    '| | Step | Details |',
    '|---|---|---|',
    ...rows,
  ].join('\n');
}

function screenshotBlobUrl(report: RunReport, stepIndex: number): string {
  const artifact = report.artifacts.find(
    (a) =>
      a.kind === ArtifactKind.Screenshot &&
      (a.filename.includes(`step-${stepIndex}`) || a.filename.includes(`error-step-${stepIndex}`)),
  );
  return artifact?.blobUrl ?? '#';
}

function artifactLinks(report: RunReport): string {
  const screenshots = report.artifacts.filter((a) => a.kind === ArtifactKind.Screenshot);
  const traces = report.artifacts.filter((a) => a.kind === ArtifactKind.Trace);

  const links: string[] = [];

  if (screenshots.length > 0) {
    const list = screenshots.map((a) => `[${a.filename}](${a.blobUrl})`).join(', ');
    links.push(`**Screenshots:** ${list}`);
  }

  if (traces.length > 0) {
    const list = traces.map((a) => `[${a.filename}](${a.blobUrl})`).join(', ');
    links.push(`**Traces:** ${list}`);
  }

  return links.join('\n');
}

const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  [FailureCategory.ProductBug]: '🐛 product bug',
  [FailureCategory.TestBug]: '🔧 test bug',
  [FailureCategory.EnvironmentIssue]: '🌐 environment issue',
  [FailureCategory.Flaky]: '⚡ flaky',
  [FailureCategory.NeedsClarification]: '❓ needs clarification',
};

function failureCategoryLine(report: RunReport): string {
  if (report.outcome !== 'fail') return '';
  if (report.timedOut) return '**Classification:** ⏱ timed out\n';
  if (!report.failureCategory) return '';
  return `**Classification:** ${FAILURE_CATEGORY_LABELS[report.failureCategory]}\n`;
}

export function formatPRComment(report: RunReport): string {
  const previewLink = report.previewUrl
    ? `**Preview:** [${report.previewUrl}](${report.previewUrl})\n`
    : '';

  const artifactSection = report.artifacts.length > 0
    ? `\n${artifactLinks(report)}\n`
    : '';

  const body = [
    `${badge(report.outcome)} **Preview QA** — ${report.outcome.toUpperCase()} in ${durationLabel(report.durationMs)}`,
    '',
    failureCategoryLine(report) + previewLink + stepTable(report),
    artifactSection,
    `<sub>Run \`${report.runId.slice(0, 8)}\` · SHA \`${report.sha.slice(0, 7)}\`</sub>`,
  ].join('\n');

  return body;
}

export function formatCheckBody(report: RunReport): string {
  const previewLink = report.previewUrl
    ? `**Preview URL:** [${report.previewUrl}](${report.previewUrl})\n\n`
    : '';

  const failedSteps = report.steps.filter((s) => !s.ok);
  const failureDetail =
    failedSteps.length > 0
      ? `\n### Failures\n${failedSteps.map((s) => `- \`${s.type}\`: ${s.error ?? 'unknown error'}`).join('\n')}\n`
      : '';

  const classificationLine = failureCategoryLine(report);

  return [
    `${previewLink}${stepTable(report)}`,
    failureDetail,
    classificationLine,
    artifactLinks(report),
  ]
    .filter(Boolean)
    .join('\n');
}
