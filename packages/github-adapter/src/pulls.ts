import { Octokit } from '@octokit/rest';
import type { PRMetadata } from './types.js';

export async function getPRMetadata(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<PRMetadata> {
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });

  return {
    id: data.id,
    number: data.number,
    title: data.title,
    body: data.body ?? null,
    headSha: data.head.sha,
    headBranch: data.head.ref,
    baseBranch: data.base.ref,
    authorLogin: data.user?.login ?? 'unknown',
    isFork: data.head.repo?.fork ?? false,
    isDraft: data.draft ?? false,
    state: data.state,
  };
}
