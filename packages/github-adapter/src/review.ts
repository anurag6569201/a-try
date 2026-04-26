import { Octokit } from '@octokit/rest';
import type { ChangedFileDetail, CreateReviewInput } from './types.js';

/**
 * Fetches the raw unified diff for a pull request.
 * Returns an empty string if the diff is unavailable or too large (> 10 MB).
 */
export async function getDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string> {
  try {
    const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
      owner,
      repo,
      pull_number: pullNumber,
      headers: { accept: 'application/vnd.github.v3.diff' },
    });
    return typeof data === 'string' ? data : '';
  } catch {
    return '';
  }
}

/**
 * Returns detailed metadata for each changed file including the per-file patch.
 * Paginates up to 10 pages (300 files max).
 */
export async function getChangedFilesDetail(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<ChangedFileDetail[]> {
  const files: ChangedFileDetail[] = [];
  let page = 1;

  while (page <= 10) {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 30,
      page,
    });

    for (const f of data) {
      files.push({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      });
    }

    if (data.length < 30) break;
    page++;
  }

  return files;
}

/**
 * Posts a GitHub Pull Request Review with optional inline comments.
 * Inline comments appear as annotations on specific diff lines.
 * Returns the review ID.
 */
export async function createPRReview(
  octokit: Octokit,
  input: CreateReviewInput,
): Promise<number> {
  // GitHub's createReview API requires line comments to reference a commit.
  // We cap inline comments at 50 to stay within GitHub's API limits.
  const safeComments = input.comments.slice(0, 50).map((c) => ({
    path: c.path,
    line: c.line,
    side: c.side ?? 'RIGHT',
    body: c.body,
  }));

  const { data } = await octokit.pulls.createReview({
    owner: input.owner,
    repo: input.repo,
    pull_number: input.pullNumber,
    commit_id: input.commitId,
    body: input.body,
    event: input.event,
    comments: safeComments,
  });

  return data.id;
}

/**
 * Dismisses a previously submitted review (e.g. when the PR is updated and we re-review).
 * This clears the old inline comments from the diff view.
 */
export async function dismissPRReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  reviewId: number,
  message: string,
): Promise<void> {
  try {
    await octokit.pulls.dismissReview({
      owner,
      repo,
      pull_number: pullNumber,
      review_id: reviewId,
      message,
    });
  } catch {
    // Non-fatal: if dismiss fails the old review remains, which is acceptable
  }
}
