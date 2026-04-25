import { RunState, RunMode, FailureCategory, ParseOutcome, ArtifactKind, BillingTier } from '@preview-qa/domain';

export interface Repository {
  id: string;
  installation_id: string;
  github_id: number;
  full_name: string;
  default_branch: string;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ModelTrace {
  id: string;
  run_id: string;
  prompt_name: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  created_at: Date;
}

export interface Installation {
  id: string;
  github_id: number;
  account_login: string;
  account_type: string;
  tier: BillingTier;
  suspended_at: Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_cycle_anchor: Date | null;
  grace_period_ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BillingEvent {
  id: string;
  installation_id: string | null;
  stripe_event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed_at: Date;
}

export interface UpsertBillingEventInput {
  installationId: string | null;
  stripeEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export interface PullRequest {
  id: string;
  repository_id: string;
  github_number: number;
  title: string;
  author_login: string;
  head_sha: string;
  head_branch: string;
  base_branch: string;
  is_fork: boolean;
  body: string | null;
  state: string;
  created_at: Date;
  updated_at: Date;
}

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

export interface AuditEvent {
  id: string;
  installation_id: string | null;
  run_id: string | null;
  event_type: string;
  actor: string | null;
  payload: Record<string, unknown>;
  created_at: Date;
}

export interface CreateAuditEventInput {
  installation_id?: string;
  run_id?: string;
  event_type: string;
  actor?: string;
  payload?: Record<string, unknown>;
}

export interface RunEmbedding {
  id: string;
  run_id: string;
  summary_text: string;
  embedding: number[];
  model: string;
  created_at: Date;
}

export interface UpsertRunEmbeddingInput {
  run_id: string;
  summary_text: string;
  embedding: number[];
  model: string;
}

export interface SimilarRun {
  run_id: string;
  summary_text: string;
  distance: number;
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
