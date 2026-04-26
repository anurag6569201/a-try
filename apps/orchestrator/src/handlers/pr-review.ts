import type { Pool } from 'pg';
import { getInstallationOctokit } from '@preview-qa/github-adapter';
import { getDiff, getChangedFilesDetail, createPRReview, dismissPRReview } from '@preview-qa/github-adapter';
import { upsertStickyComment } from '@preview-qa/github-adapter';
import { getFileContent } from '@preview-qa/github-adapter';
import {
  reviewPR,
  formatSummaryComment,
  formatInlineComment,
  findingsForInlineAnnotation,
  type GroundedFinding,
} from '@preview-qa/code-reviewer';
import { sanitizeForLlm } from '@preview-qa/planner';
import { createAzureOpenAIClient } from '@preview-qa/ai';
import type { OrchestratorConfig } from '../types.js';

export interface PrReviewContext {
  pool: Pool;
  config: OrchestratorConfig;
  log: { info: (obj: object, msg: string) => void; error: (obj: object, msg: string) => void; warn: (obj: object, msg: string) => void };
}

export interface PrReviewInput {
  pullRequestId: string;
  githubNumber: number;
  sha: string;
  owner: string;
  repo: string;
  title: string;
  body: string | null;
  installationGithubId: number;
}

/**
 * Full PR review pipeline: fetches diff, runs 7 specialist agents,
 * grounds findings in history, and posts GitHub review + sticky comment.
 */
export async function handlePrReview(
  ctx: PrReviewContext,
  input: PrReviewInput,
): Promise<void> {
  const { pool, config, log } = ctx;

  if (!config.ai) {
    log.warn({ prId: input.pullRequestId }, 'PR review skipped: AI config not set');
    return;
  }

  const aiClient = createAzureOpenAIClient(config.ai);
  const octokit = await getInstallationOctokit(config.github, input.installationGithubId);

  log.info({ prId: input.pullRequestId, pr: input.githubNumber }, 'Starting PR review');

  // Fetch diff and changed files in parallel
  const [diff, changedFiles] = await Promise.all([
    getDiff(octokit, input.owner, input.repo, input.githubNumber),
    getChangedFilesDetail(octokit, input.owner, input.repo, input.githubNumber),
  ]);

  if (!diff || changedFiles.length === 0) {
    log.warn({ prId: input.pullRequestId }, 'PR review skipped: empty diff');
    return;
  }

  // Fetch full content of changed TypeScript/JavaScript files (up to 20 files)
  const fileContents = new Map<string, string>();
  const tsFiles = changedFiles
    .filter((f) => f.status !== 'removed')
    .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f.filename))
    .slice(0, 20);

  await Promise.all(
    tsFiles.map(async (f) => {
      const content = await getFileContent(octokit, input.owner, input.repo, f.filename, input.sha);
      if (content && content.length <= 100_000) {
        fileContents.set(f.filename, content);
      }
    }),
  );

  const techHints = detectTechHints(changedFiles.map((f) => f.filename));

  // Run the full review pipeline
  const output = await reviewPR(
    {
      reviewId: input.pullRequestId,
      prTitle: sanitizeForLlm(input.title),
      prBody: sanitizeForLlm(input.body ?? ''),
      diff,
      changedFiles: changedFiles.map((f) => ({
        filename: f.filename,
        // Normalise GitHub's extended statuses to our subset
        status: normaliseStatus(f.status),
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
      fileContents,
      techHints,
    },
    {
      client: aiClient,
      pool,
      reviewDeployment: config.ai.deployments.codeReview ?? config.ai.deployments.planNormalizer,
      embeddingDeployment: config.ai.deployments.embeddings,
    },
  );

  log.info(
    { prId: input.pullRequestId, score: output.score, findings: output.findings.length },
    'PR review complete',
  );

  // Upsert review_record in DB
  const existingRecord = await getExistingReviewRecord(pool, input.pullRequestId);
  const reviewRecordId = await upsertReviewRecord(pool, {
    pullRequestId: input.pullRequestId,
    score: output.score,
    riskLevel: output.riskLevel,
    agentsRun: output.stats.agentsRun,
    findingsCount: output.findings.length,
    existingId: existingRecord?.id,
  });

  // Save findings to DB
  await saveFindings(pool, reviewRecordId, output.findings as GroundedFinding[]);

  // Inline annotations: only error/warning with a line number
  const inlineFindings = findingsForInlineAnnotation(output.findings as GroundedFinding[]);
  const inlineComments = inlineFindings.map((f) => ({
    path: f.file!,
    line: f.line!,
    body: formatInlineComment(f),
  }));

  // Dismiss previous review to clean up stale inline comments
  if (existingRecord?.github_review_id) {
    await dismissPRReview(
      octokit,
      input.owner,
      input.repo,
      input.githubNumber,
      Number(existingRecord.github_review_id),
      'Superseded by updated review on new commit.',
    );
  }

  // Post GitHub PR Review with inline annotations
  let githubReviewId: number | undefined;
  try {
    githubReviewId = await createPRReview(octokit, {
      owner: input.owner,
      repo: input.repo,
      pullNumber: input.githubNumber,
      commitId: input.sha,
      body: '',
      event: output.score === 'block' ? 'REQUEST_CHANGES' : 'COMMENT',
      comments: inlineComments,
    });
  } catch (err) {
    log.warn({ err, prId: input.pullRequestId }, 'Failed to post inline review');
  }

  // Build and post sticky summary comment
  const summaryBody = formatSummaryComment(
    reviewRecordId,
    input.githubNumber,
    output,
    output.findings as GroundedFinding[],
  );

  const commentId = await upsertStickyComment(octokit, {
    owner: input.owner,
    repo: input.repo,
    pullNumber: input.githubNumber,
    body: summaryBody,
    ...(existingRecord?.github_comment_id != null
      ? { existingCommentId: Number(existingRecord.github_comment_id) }
      : {}),
  });

  await pool.query(
    `UPDATE review_record SET github_comment_id = $1, github_review_id = $2, updated_at = NOW() WHERE id = $3`,
    [commentId, githubReviewId ?? null, reviewRecordId],
  );

  log.info({ prId: input.pullRequestId, commentId, githubReviewId }, 'PR review posted');
}

// ── DB helpers ────────────────────────────────────────────────────────────────

interface ReviewRecord {
  id: string;
  github_comment_id: number | null;
  github_review_id: number | null;
}

async function getExistingReviewRecord(pool: Pool, pullRequestId: string): Promise<ReviewRecord | null> {
  const { rows } = await pool.query<ReviewRecord>(
    `SELECT id, github_comment_id, github_review_id FROM review_record WHERE pull_request_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [pullRequestId],
  );
  return rows[0] ?? null;
}

async function upsertReviewRecord(
  pool: Pool,
  input: {
    pullRequestId: string;
    score: string;
    riskLevel: string;
    agentsRun: number;
    findingsCount: number;
    existingId: string | undefined;
  },
): Promise<string> {
  if (input.existingId !== undefined) {
    await pool.query(
      `UPDATE review_record SET score = $1, risk_level = $2, agents_run = $3, findings_count = $4, updated_at = NOW() WHERE id = $5`,
      [input.score, input.riskLevel, input.agentsRun, input.findingsCount, input.existingId],
    );
    return input.existingId;
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO review_record (pull_request_id, score, risk_level, agents_run, findings_count)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.pullRequestId, input.score, input.riskLevel, input.agentsRun, input.findingsCount],
  );
  return rows[0]!.id;
}

async function saveFindings(pool: Pool, reviewId: string, findings: GroundedFinding[]): Promise<void> {
  await pool.query(`DELETE FROM review_finding WHERE review_id = $1`, [reviewId]);
  for (const f of findings) {
    await pool.query(
      `INSERT INTO review_finding (review_id, agent, severity, file, line, title, body, suggestion, confidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [reviewId, f.agent, f.severity, f.file ?? null, f.line ?? null, f.title, f.body, f.suggestion ?? null, f.confidence],
    );
  }
}

function normaliseStatus(
  status: string,
): 'added' | 'modified' | 'removed' | 'renamed' {
  if (status === 'added') return 'added';
  if (status === 'removed') return 'removed';
  if (status === 'renamed') return 'renamed';
  return 'modified';
}

function detectTechHints(filenames: string[]): string[] {
  const hints = new Set<string>();
  for (const f of filenames) {
    if (f.endsWith('.tsx') || f.includes('/components/')) hints.add('React');
    if (f.includes('app/') || f.includes('pages/')) hints.add('Next.js');
    if (f.endsWith('.sql')) hints.add('PostgreSQL');
    if (f.includes('/routes/')) hints.add('Hono API');
    if (f.endsWith('.test.ts') || f.endsWith('.spec.ts')) hints.add('Vitest');
  }
  return [...hints];
}
