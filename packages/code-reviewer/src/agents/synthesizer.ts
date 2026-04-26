import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { chatComplete, logModelTrace } from '@preview-qa/ai';
import type { Finding, ReviewOutput, ReviewContext, FileWalkthrough, ReviewScore, RiskLevel } from '../types.js';

const SYSTEM_PROMPT = `You are a principal engineer synthesizing a multi-agent code review into a final report.

You receive findings from 7 specialist agents (security, logic, type_safety, performance, test_coverage, architecture, documentation).

Your tasks:
1. Deduplicate findings that refer to the same issue (same file + similar title/body). Keep the one with higher severity.
2. Rank all findings by: severity (error > warning > info) then confidence (high > medium > low).
3. Write a 2-3 sentence executive summary: what does this PR do, what is the overall risk, what is the most important finding.
4. Write a one-sentence walkthrough for each changed file explaining what changed and why it matters.
5. Assign an overall score:
   - "block": has error-severity security or logic finding with high confidence → DO NOT merge
   - "major": has 3+ error findings or a critical security issue → needs significant changes
   - "minor": has warnings but no errors → small fixes needed
   - "lgtm": only info findings or no findings → approve
6. Assign a risk level: "critical" | "high" | "medium" | "low"

Return ONLY valid JSON:
{
  "score": "lgtm" | "minor" | "major" | "block",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "executiveSummary": "2-3 sentences.",
  "walkthrough": [
    { "file": "path/to/file.ts", "summary": "One sentence." }
  ],
  "rankedFindings": [
    {
      "agent": "security",
      "severity": "error",
      "file": "path/to/file.ts",
      "line": 42,
      "title": "...",
      "body": "...",
      "suggestion": "...",
      "confidence": "high",
      "cwe": "CWE-89"
    }
  ]
}`;

interface SynthesizerOutput {
  score: ReviewScore;
  riskLevel: RiskLevel;
  executiveSummary: string;
  walkthrough: FileWalkthrough[];
  rankedFindings: Finding[];
}

export async function runSynthesizer(
  client: AzureOpenAI,
  pool: Pool,
  deployment: string,
  reviewId: string,
  reviewCtx: ReviewContext,
  allFindings: Finding[],
): Promise<ReviewOutput> {
  const start = Date.now();

  const userMessage = JSON.stringify({
    prTitle: reviewCtx.prTitle,
    changedFiles: reviewCtx.changedFiles.map((f) => f.filename),
    allFindings,
  });

  const { content, inputTokens, outputTokens } = await chatComplete(
    client,
    deployment,
    SYSTEM_PROMPT,
    userMessage,
  );

  await logModelTrace(pool, {
    runId: reviewId,
    promptName: 'code_review.synthesizer',
    model: deployment,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - start,
  });

  let parsed: SynthesizerOutput;
  try {
    parsed = JSON.parse(content) as SynthesizerOutput;
  } catch {
    // Fallback: use raw findings sorted by severity if synthesizer fails
    parsed = {
      score: allFindings.some((f) => f.severity === 'error') ? 'major' : allFindings.some((f) => f.severity === 'warning') ? 'minor' : 'lgtm',
      riskLevel: allFindings.some((f) => f.severity === 'error') ? 'high' : 'low',
      executiveSummary: `Found ${allFindings.length} findings across ${reviewCtx.changedFiles.length} changed files.`,
      walkthrough: reviewCtx.changedFiles.map((f) => ({ file: f.filename, summary: `${f.status} (${f.additions} additions, ${f.deletions} deletions)` })),
      rankedFindings: sortFindings(allFindings),
    };
  }

  const findings = Array.isArray(parsed.rankedFindings) ? parsed.rankedFindings : sortFindings(allFindings);

  return {
    score: parsed.score ?? 'lgtm',
    riskLevel: parsed.riskLevel ?? 'low',
    executiveSummary: parsed.executiveSummary ?? '',
    walkthrough: Array.isArray(parsed.walkthrough) ? parsed.walkthrough : [],
    findings,
    stats: {
      errors: findings.filter((f) => f.severity === 'error').length,
      warnings: findings.filter((f) => f.severity === 'warning').length,
      info: findings.filter((f) => f.severity === 'info').length,
      agentsRun: 7,
      totalFindingsBeforeDedup: allFindings.length,
      durationMs: Date.now() - start,
    },
  };
}

function sortFindings(findings: Finding[]): Finding[] {
  const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
  const confidenceOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...findings].sort((a, b) => {
    const sev = (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2);
    if (sev !== 0) return sev;
    return (confidenceOrder[a.confidence] ?? 1) - (confidenceOrder[b.confidence] ?? 1);
  });
}
