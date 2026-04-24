import { RunState, RunMode, FailureCategory, ParseOutcome, ArtifactKind } from '@preview-qa/domain';

export interface Run {
  id: string;
  pull_request_id: string;
  repository_id: string;
  installation_id: string;
  sha: string;
  mode: RunMode;
  state: RunState;
  preview_url: string | null;
  triggered_by: string;
  github_check_id: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRunInput {
  pull_request_id: string;
  repository_id: string;
  installation_id: string;
  sha: string;
  mode: RunMode;
  triggered_by?: string;
}

export interface UpdateRunInput {
  state?: RunState;
  preview_url?: string;
  github_check_id?: number;
  started_at?: Date;
  completed_at?: Date;
}

export interface Plan {
  id: string;
  run_id: string;
  parse_outcome: ParseOutcome;
  raw_yaml: string | null;
  created_at: Date;
}

export interface Result {
  id: string;
  run_id: string;
  test_case_id: string | null;
  outcome: 'pass' | 'fail' | 'blocked' | 'skipped';
  failure_category: FailureCategory | null;
  summary: string | null;
  step_results: unknown[];
  duration_ms: number | null;
  created_at: Date;
}

export interface Artifact {
  id: string;
  run_id: string;
  result_id: string | null;
  kind: ArtifactKind;
  blob_url: string;
  filename: string;
  size_bytes: number | null;
  expires_at: Date | null;
  created_at: Date;
}
