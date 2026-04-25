import type {
  PullRequestWebhookPayload,
  DeploymentStatusPayload,
  IssueCommentPayload,
} from '@preview-qa/schemas';

export interface NormalizedPRPayload {
  githubNumber: number;
  sha: string;
  headBranch: string;
  baseBranch: string;
  authorLogin: string;
  isFork: boolean;
  title: string;
  body: string | null;
  repositoryGithubId: number;
  repositoryFullName: string;
  installationGithubId: number;
}

export interface NormalizedDeploymentPayload {
  sha: string;
  environment: string;
  state: string;
  environmentUrl: string | null;
  repositoryGithubId: number;
  installationGithubId: number;
}

export function normalizePRPayload(payload: PullRequestWebhookPayload): NormalizedPRPayload {
  const pr = payload.pull_request;
  return {
    githubNumber: pr.number,
    sha: pr.head.sha,
    headBranch: pr.head.ref,
    baseBranch: pr.base.ref,
    authorLogin: pr.user.login,
    isFork: pr.head.repo.fork,
    title: pr.title,
    body: pr.body,
    repositoryGithubId: payload.repository.id,
    repositoryFullName: payload.repository.full_name,
    installationGithubId: payload.installation.id,
  };
}

export function normalizeDeploymentPayload(
  payload: DeploymentStatusPayload,
): NormalizedDeploymentPayload {
  return {
    sha: payload.deployment.sha,
    environment: payload.deployment_status.environment,
    state: payload.deployment_status.state,
    environmentUrl: payload.deployment_status.environment_url,
    repositoryGithubId: payload.repository.id,
    installationGithubId: payload.installation.id,
  };
}

export interface NormalizedIssueCommentPayload {
  githubNumber: number;
  commentId: number;
  body: string;
  authorLogin: string;
  repositoryGithubId: number;
  repositoryFullName: string;
  installationGithubId: number;
  isPullRequest: boolean;
}

export function normalizeIssueCommentPayload(
  payload: IssueCommentPayload,
): NormalizedIssueCommentPayload {
  return {
    githubNumber: payload.issue.number,
    commentId: payload.comment.id,
    body: payload.comment.body,
    authorLogin: payload.comment.user.login,
    repositoryGithubId: payload.repository.id,
    repositoryFullName: payload.repository.full_name,
    installationGithubId: payload.installation.id,
    isPullRequest: payload.issue.pull_request !== undefined,
  };
}
