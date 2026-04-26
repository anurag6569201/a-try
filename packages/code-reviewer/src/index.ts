import type { AzureOpenAI } from 'openai';
import type { Pool } from 'pg';
import { buildKnowledgeGraph } from './knowledge-graph.js';
import { chunkDiff } from './diff-chunker.js';
import { runSecurityAgent } from './agents/security.js';
import { runLogicAgent } from './agents/logic.js';
import { runTypeSafetyAgent } from './agents/type-safety.js';
import { runPerformanceAgent } from './agents/performance.js';
import { runTestCoverageAgent } from './agents/test-coverage.js';
import { runArchitectureAgent } from './agents/architecture.js';
import { runDocumentationAgent } from './agents/documentation.js';
import { runSynthesizer } from './agents/synthesizer.js';
import { groundInHistory, saveFindingEmbeddings } from './history.js';
import type { ReviewOutput, ReviewContext, ChangedFile, Finding, GroundedFinding } from './types.js';

export type { ReviewOutput, ReviewContext, ChangedFile, Finding, GroundedFinding };
export { formatSummaryComment, formatInlineComment, findingsForInlineAnnotation, REVIEW_COMMENT_MARKER } from './formatter.js';

export interface ReviewInput {
  reviewId: string;
  prTitle: string;
  prBody: string;
  diff: string;
  changedFiles: ChangedFile[];
  /** Map of filename → full file content, for context */
  fileContents: Map<string, string>;
  techHints?: string[];
}

export interface ReviewDependencies {
  client: AzureOpenAI;
  pool: Pool;
  /** Azure OpenAI deployment name to use for all review agents */
  reviewDeployment: string;
  /** Azure OpenAI deployment name for embeddings (text-embedding-3-small) */
  embeddingDeployment: string;
}

/**
 * Main entry point: runs all 7 specialist agents in parallel, synthesizes results,
 * grounds findings in history, and returns the full review output.
 */
export async function reviewPR(
  input: ReviewInput,
  deps: ReviewDependencies,
): Promise<ReviewOutput> {
  const { client, pool, reviewDeployment, embeddingDeployment } = deps;
  const startMs = Date.now();

  // Build knowledge graph from TypeScript files
  const knowledgeGraph = buildKnowledgeGraph(input.fileContents);

  const reviewCtx: ReviewContext = {
    prTitle: input.prTitle,
    prBody: input.prBody,
    diff: input.diff,
    changedFiles: input.changedFiles,
    fileContents: input.fileContents,
    knowledgeGraph,
    techHints: input.techHints ?? [],
  };

  // Chunk the diff and assign agents
  const chunks = chunkDiff(input.diff, input.changedFiles);

  const agentCtx = { client, pool, deployment: reviewDeployment, reviewId: input.reviewId };

  // Run all 7 agents in parallel — individual failures don't fail the whole review
  const [security, logic, types, perf, tests, arch, docs] = await Promise.allSettled([
    runSecurityAgent(agentCtx, reviewCtx, chunks),
    runLogicAgent(agentCtx, reviewCtx, chunks),
    runTypeSafetyAgent(agentCtx, reviewCtx, chunks),
    runPerformanceAgent(agentCtx, reviewCtx, chunks),
    runTestCoverageAgent(agentCtx, reviewCtx, chunks),
    runArchitectureAgent(agentCtx, reviewCtx, chunks),
    runDocumentationAgent(agentCtx, reviewCtx, chunks),
  ]);

  const allFindings: Finding[] = [
    ...settled(security),
    ...settled(logic),
    ...settled(types),
    ...settled(perf),
    ...settled(tests),
    ...settled(arch),
    ...settled(docs),
  ];

  // Synthesize: dedup, rank, executive summary
  const output = await runSynthesizer(
    client,
    pool,
    reviewDeployment,
    input.reviewId,
    reviewCtx,
    allFindings,
  );

  // Ground findings in history (suppress dismissed, boost accepted)
  const groundedFindings = await groundInHistory(pool, client, embeddingDeployment, output.findings);

  // Save embeddings for future history lookups (best-effort, non-blocking)
  void saveFindingEmbeddings(pool, client, embeddingDeployment, input.reviewId, output.findings).catch(() => null);

  return {
    ...output,
    findings: groundedFindings,
    stats: {
      ...output.stats,
      totalFindingsBeforeDedup: allFindings.length,
      durationMs: Date.now() - startMs,
    },
  };
}

function settled<T>(result: PromiseSettledResult<T[]>): T[] {
  return result.status === 'fulfilled' ? result.value : [];
}
