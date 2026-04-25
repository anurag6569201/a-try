import type {
  PullRequestWebhookPayload,
  DeploymentStatusPayload,
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
