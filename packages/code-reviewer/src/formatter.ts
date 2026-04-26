import type { ReviewOutput, GroundedFinding } from './types.js';

const SCORE_BADGE: Record<string, string> = {
  lgtm:  '✅ LGTM',
  minor: '🟡 Needs minor fixes',
  major: '🟠 Needs major fixes',
  block: '🔴 Do not merge',
};

const RISK_BADGE: Record<string, string> = {
  low:      '🟢 low',
  medium:   '🟡 medium',
  high:     '🟠 high',
  critical: '🔴 critical',
};

const SEV_ICON: Record<string, string> = {
  error:   '🔴',
  warning: '🟡',
  info:    '🔵',
};

const AGENT_LABEL: Record<string, string> = {
  security:      'Security',
  logic:         'Logic',
  type_safety:   'Types',
  performance:   'Performance',
  test_coverage: 'Tests',
  architecture:  'Architecture',
  documentation: 'Docs',
};

/** Unique marker so we can find and update the comment later */
export const REVIEW_COMMENT_MARKER = '<!-- previewqa:review -->';

/** Builds the sticky summary comment body */
export function formatSummaryComment(
  reviewId: string,
  prNumber: number,
  output: ReviewOutput,
  groundedFindings: GroundedFinding[],
): string {
  const { score, riskLevel, executiveSummary, walkthrough, stats } = output;

  const visibleFindings = groundedFindings.filter((f) => !f.suppressedByHistory);
  const errors = visibleFindings.filter((f) => f.severity === 'error').length;
  const warnings = visibleFindings.filter((f) => f.severity === 'warning').length;
  const info = visibleFindings.filter((f) => f.severity === 'info').length;

  const findingsTable =
    visibleFindings.length === 0
      ? '_No findings._'
      : [
          '| Sev | Agent | Finding | Location |',
          '|-----|-------|---------|----------|',
          ...visibleFindings.slice(0, 25).map((f) => {
            const icon = SEV_ICON[f.severity] ?? '🔵';
            const agent = AGENT_LABEL[f.agent] ?? f.agent;
            const location = f.file ? `\`${f.file}${f.line ? `:${f.line}` : ''}\`` : '—';
            const note = f.historyNote ? ` _(${f.historyNote})_` : '';
            return `| ${icon} | ${agent} | ${f.title}${note} | ${location} |`;
          }),
          visibleFindings.length > 25 ? `| … | … | _${visibleFindings.length - 25} more — see inline comments_ | |` : '',
        ]
          .filter(Boolean)
          .join('\n');

  const walkthroughSection =
    walkthrough.length === 0
      ? ''
      : [
          '### File walkthrough',
          '| File | Change |',
          '|------|--------|',
          ...walkthrough.map((w) => `| \`${w.file}\` | ${w.summary} |`),
        ].join('\n');

  const suppressedCount = groundedFindings.filter((f) => f.suppressedByHistory).length;
  const suppressedNote = suppressedCount > 0
    ? `\n> _${suppressedCount} finding(s) suppressed — identical to previously dismissed findings._`
    : '';

  return [
    REVIEW_COMMENT_MARKER,
    `## PreviewQA Code Review · PR #${prNumber}`,
    '',
    `> ${SCORE_BADGE[score] ?? score} · Risk: ${RISK_BADGE[riskLevel] ?? riskLevel} · ${errors} errors · ${warnings} warnings · ${info} info`,
    '',
    '### Summary',
    executiveSummary,
    '',
    walkthroughSection,
    walkthroughSection ? '' : null,
    '### Findings',
    findingsTable,
    suppressedNote,
    '',
    '> Inline annotations are posted as review comments on the diff for error and warning findings.',
    '',
    `---`,
    `*${stats.agentsRun} agents · ${stats.totalFindingsBeforeDedup} raw findings · rendered in ${Math.round(stats.durationMs / 1000)}s · review id: \`${reviewId}\`*`,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

/** Builds the body for one inline GitHub review comment */
export function formatInlineComment(finding: GroundedFinding): string {
  const icon = SEV_ICON[finding.severity] ?? '🔵';
  const agent = AGENT_LABEL[finding.agent] ?? finding.agent;
  const conf = finding.confidence === 'high' ? 'High confidence' : finding.confidence === 'medium' ? 'Medium confidence' : 'Low confidence';
  const cweNote = finding.cwe ? ` · ${finding.cwe}` : '';
  const historyNote = finding.historyNote ? `\n\n> ℹ️ ${finding.historyNote}` : '';

  const lines: string[] = [
    `${icon} **${agent}** · ${conf}${cweNote}`,
    '',
    `**${finding.title}**`,
    '',
    finding.body,
    historyNote,
  ];

  if (finding.suggestion) {
    lines.push('', '**Suggested fix:**', finding.suggestion);
  }

  return lines.filter((l) => l !== null).join('\n');
}

/** Returns only findings suitable for inline annotation (have a file+line, not suppressed, error or warning) */
export function findingsForInlineAnnotation(findings: GroundedFinding[]): GroundedFinding[] {
  return findings.filter(
    (f) =>
      !f.suppressedByHistory &&
      f.file != null &&
      f.line != null &&
      (f.severity === 'error' || f.severity === 'warning'),
  );
}
