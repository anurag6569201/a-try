import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { chatComplete, logModelTrace } from '@preview-qa/ai';
import type { Finding, AgentName, ReviewContext } from '../types.js';

export interface AgentContext {
  client: AzureOpenAI;
  pool: Pool;
  deployment: string;
  reviewId: string;
}

/** Shared prompt builder for all agents */
export function buildUserMessage(ctx: ReviewContext, diffChunk: string, extraContext?: string): string {
  const fileList = ctx.changedFiles.map((f) => `  ${f.status} ${f.filename} (+${f.additions}/-${f.deletions})`).join('\n');

  const fileContentSection = ctx.fileContents.size > 0
    ? [...ctx.fileContents.entries()]
        .map(([f, c]) => `### ${f}\n\`\`\`\n${c.slice(0, 8000)}\n\`\`\``)
        .join('\n\n')
    : '(no full file content available)';

  return [
    '## PR Context',
    `Title: ${ctx.prTitle}`,
    `Description:\n${ctx.prBody.slice(0, 1000)}`,
    '',
    '## Changed Files',
    fileList,
    '',
    '## Diff',
    '```diff',
    diffChunk.slice(0, 18000),
    '```',
    '',
    '## Full File Contents (for context)',
    fileContentSection,
    '',
    '## Symbol Graph',
    ctx.knowledgeGraph.symbols.length > 0
      ? ctx.knowledgeGraph.symbols.slice(0, 80).map((s) => `  ${s.kind} ${s.name} @ ${s.file}:${s.line}`).join('\n')
      : '(not available)',
    '',
    '## Call Edges (sampled)',
    ctx.knowledgeGraph.edges.length > 0
      ? ctx.knowledgeGraph.edges.slice(0, 40).map((e) => `  ${e.from} → ${e.kind} → ${e.to}`).join('\n')
      : '(not available)',
    extraContext ?? '',
  ].join('\n');
}

/** Runs one agent, calling the LLM and parsing the JSON findings array. */
export async function runAgent(
  agentCtx: AgentContext,
  reviewCtx: ReviewContext,
  agentName: AgentName,
  systemPrompt: string,
  diffChunk: string,
  extraContext?: string,
): Promise<Finding[]> {
  const userMessage = buildUserMessage(reviewCtx, diffChunk, extraContext);
  const start = Date.now();

  const { content, inputTokens, outputTokens } = await chatComplete(
    agentCtx.client,
    agentCtx.deployment,
    systemPrompt,
    userMessage,
  );

  await logModelTrace(agentCtx.pool, {
    runId: agentCtx.reviewId,
    promptName: `code_review.${agentName}`,
    model: agentCtx.deployment,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - start,
  });

  let parsed: { findings?: unknown[] };
  try {
    parsed = JSON.parse(content) as { findings?: unknown[] };
  } catch {
    return [];
  }

  if (!Array.isArray(parsed.findings)) return [];

  return parsed.findings
    .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
    .map((f) => ({
      agent: agentName,
      severity: String(f['severity'] ?? 'info') as Finding['severity'],
      file: typeof f['file'] === 'string' ? f['file'] : undefined,
      line: typeof f['line'] === 'number' ? f['line'] : undefined,
      title: String(f['title'] ?? ''),
      body: String(f['body'] ?? ''),
      suggestion: typeof f['suggestion'] === 'string' ? f['suggestion'] : undefined,
      confidence: String(f['confidence'] ?? 'medium') as Finding['confidence'],
      cwe: typeof f['cwe'] === 'string' ? f['cwe'] : undefined,
    }))
    .filter((f) => f.title.length > 0 && f.body.length > 0);
}

/** Merges findings from multiple chunks of the same agent, deduplicating by (file, title) */
export function mergeChunkFindings(findingGroups: Finding[][]): Finding[] {
  const seen = new Set<string>();
  const merged: Finding[] = [];
  for (const group of findingGroups) {
    for (const f of group) {
      const key = `${f.file ?? ''}|${f.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(f);
      }
    }
  }
  return merged;
}
