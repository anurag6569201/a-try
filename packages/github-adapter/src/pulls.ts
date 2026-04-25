import { Octokit } from '@octokit/rest';
import type { PRMetadata } from './types.js';

export async function isCollaborator(
  octokit: Octokit,
  owner: string,
  repo: string,
  login: string,
): Promise<boolean> {
  try {
    const { status } = await octokit.repos.checkCollaborator({ owner, repo, username: login });
    return status === 204;
  } catch {
    return false;
  }
}

export async function postComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<number> {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  return data.id;
}

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
