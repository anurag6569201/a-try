export type PreviewResolutionStatus = 'resolved' | 'waiting_for_preview' | 'not_found';

export interface PreviewResolutionResult {
  status: PreviewResolutionStatus;
  url?: string;
}

export interface VercelDeployment {
  uid: string;
  url: string;
  state: string;
  meta?: Record<string, string>;
  createdAt: number;
}

export interface VercelAdapterConfig {
  apiToken: string;
  teamId?: string;
}

export interface GitHubDeployment {
  id: number;
  sha: string;
  environment: string;
  environmentUrl: string | null;
  state: string;
}
