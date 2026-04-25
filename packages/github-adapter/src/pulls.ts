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

export async function getPRChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<string[]> {
  const files: string[] = [];
  let page = 1;
  // GitHub paginates at 30 per page, cap at 3 pages (90 files) to stay cheap
  while (page <= 3) {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 30,
      page,
    });
    for (const f of data) {
      files.push(f.filename);
    }
    if (data.length < 30) break;
    page++;
  }
  return files;
}

export async function listOpenPRs(
  octokit: Octokit,
  owner: string,
  repo: string,
  limit = 10,
): Promise<PRMetadata[]> {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    sort: 'updated',
    direction: 'desc',
    per_page: Math.min(limit, 100),
  });
  return data.map((pr) => ({
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body ?? null,
    headSha: pr.head.sha,
    headBranch: pr.head.ref,
    baseBranch: pr.base.ref,
    authorLogin: pr.user?.login ?? 'unknown',
    isFork: pr.head.repo?.fork ?? false,
    isDraft: pr.draft ?? false,
    state: pr.state,
  }));
}

export async function fileExistsInRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<boolean> {
  try {
    await octokit.repos.getContent({ owner, repo, path, ...(ref !== undefined ? { ref } : {}) });
    return true;
  } catch {
    return false;
  }
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref?: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ...(ref !== undefined ? { ref } : {}) });
    if (!('content' in data) || typeof data.content !== 'string') return null;
    return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {
    return null;
  }
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
