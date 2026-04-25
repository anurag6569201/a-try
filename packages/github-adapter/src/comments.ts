import { Octokit } from '@octokit/rest';
import type { UpsertCommentInput } from './types.js';

const STICKY_MARKER = '<!-- preview-qa-sticky -->';

export async function upsertStickyComment(
  octokit: Octokit,
  input: UpsertCommentInput,
): Promise<number> {
  const body = `${STICKY_MARKER}\n${input.body}`;

  // Update existing comment if we already have its ID
  if (input.existingCommentId) {
    await octokit.issues.updateComment({
      owner: input.owner,
      repo: input.repo,
      comment_id: input.existingCommentId,
      body,
    });
    return input.existingCommentId;
  }

  // Search for an existing sticky comment by marker
  const { data: comments } = await octokit.issues.listComments({
    owner: input.owner,
    repo: input.repo,
    issue_number: input.pullNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(STICKY_MARKER));

  if (existing) {
    await octokit.issues.updateComment({
      owner: input.owner,
      repo: input.repo,
      comment_id: existing.id,
      body,
    });
    return existing.id;
  }

  // Create a new sticky comment
  const { data: created } = await octokit.issues.createComment({
    owner: input.owner,
    repo: input.repo,
    issue_number: input.pullNumber,
    body,
  });

  return created.id;
}
