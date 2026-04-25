import type { RunMode } from '@preview-qa/domain';
import type { AzureOpenAIConfig } from '@preview-qa/ai';

export interface OrchestratorConfig {
  serviceBusConnectionString: string;
  queueName: string;
  dbConnectionString: string;
  github: {
    appId: number;
    privateKey: string;
  };
  vercel: {
    apiToken: string;
    teamId?: string;
  };
  storage: {
    connectionString: string;
    containerName: string;
  };
  keyVaultUrl?: string;
  concurrencyCap?: number;
  maxTestCasesPerPR?: number;
  rerunRateLimitPerHour?: number;
  ai?: AzureOpenAIConfig;
}

export interface PREventPayload {
  pullRequestId: string;
  githubNumber: number;
  sha: string;
  headBranch: string;
  baseBranch: string;
  authorLogin: string;
  isFork: boolean;
  title: string;
  body: string | null;
  owner: string;
  repo: string;
  installationId: string;
  repositoryId: string;
  vercelProjectId?: string;
  mode: RunMode;
}

export interface DeploymentStatusPayload {
  pullRequestId?: string;
  sha: string;
  environment: string;
  state: 'pending' | 'success' | 'failure' | 'error' | 'inactive' | 'queued' | 'in_progress';
  environmentUrl: string | null;
}
