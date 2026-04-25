export interface CheckRunOutput {
  title: string;
  summary: string;
  text?: string;
}

export type CheckRunStatus = 'queued' | 'in_progress' | 'completed';
export type CheckRunConclusion =
  | 'success'
  | 'failure'
  | 'neutral'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required';

export interface CreateCheckRunInput {
  owner: string;
  repo: string;
  name: string;
  headSha: string;
  status: CheckRunStatus;
  output?: CheckRunOutput;
  externalId?: string;
}

export interface UpdateCheckRunInput {
  owner: string;
  repo: string;
  checkRunId: number;
  status: CheckRunStatus;
  conclusion?: CheckRunConclusion;
  output?: CheckRunOutput;
  completedAt?: string;
}

export interface UpsertCommentInput {
  owner: string;
  repo: string;
  pullNumber: number;
  body: string;
  existingCommentId?: number;
}

export interface PRMetadata {
  id: number;
  number: number;
  title: string;
  body: string | null;
  headSha: string;
  headBranch: string;
  baseBranch: string;
  authorLogin: string;
  isFork: boolean;
  isDraft: boolean;
  state: string;
}
