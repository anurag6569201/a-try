export type BillingTier = 'free' | 'starter' | 'growth' | 'team';
export type RunState =
  | 'queued' | 'waiting_for_preview' | 'planning' | 'running'
  | 'analyzing' | 'reporting' | 'completed' | 'failed'
  | 'blocked_environment' | 'needs_human' | 'canceled';
export type RunMode = 'smoke' | 'instruction' | 'hybrid';
export type RunOutcome = 'pass' | 'fail' | 'blocked' | 'skipped';
export type FailureCategory = 'product_bug' | 'test_bug' | 'environment_issue' | 'flaky' | 'needs_clarification';
export type ArtifactKind = 'screenshot' | 'trace' | 'video' | 'log';

export interface Installation {
  id: string;
  github_id: number;
  account_login: string;
  account_type: string;
  tier: BillingTier;
  suspended_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_cycle_anchor: string | null;
  grace_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  installation_id: string;
  github_id: number;
  full_name: string;
  default_branch: string;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Result {
  id: string;
  run_id: string;
  test_case_id: string | null;
  outcome: RunOutcome;
  failure_category: FailureCategory | null;
  summary: string | null;
  step_results: unknown[];
  duration_ms: number | null;
  created_at: string;
}

export interface Artifact {
  id: string;
  run_id: string;
  result_id: string | null;
  kind: ArtifactKind;
  blob_url: string;
  filename: string;
  size_bytes: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface ModelTrace {
  id: string;
  run_id: string;
  prompt_name: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface UsageStats {
  monthly_runs: number;
  active_repos: number;
}

export const TIER_META: Record<BillingTier, { label: string; color: string }> = {
  free:    { label: 'Free',    color: 'bg-gray-100 text-gray-600'    },
  starter: { label: 'Starter', color: 'bg-blue-100 text-blue-700'   },
  growth:  { label: 'Growth',  color: 'bg-purple-100 text-purple-700' },
  team:    { label: 'Team',    color: 'bg-amber-100 text-amber-700'  },
};

export const TIER_LIMITS: Record<BillingTier, { runsPerMonth: number; concurrencyCap: number; reposPerInstallation: number; priceMonthly: number }> = {
  free:    { runsPerMonth: 50,    concurrencyCap: 2,  reposPerInstallation: 1,   priceMonthly: 0    },
  starter: { runsPerMonth: 500,   concurrencyCap: 5,  reposPerInstallation: 5,   priceMonthly: 29   },
  growth:  { runsPerMonth: 2000,  concurrencyCap: 10, reposPerInstallation: 20,  priceMonthly: 99   },
  team:    { runsPerMonth: 10000, concurrencyCap: 20, reposPerInstallation: 100, priceMonthly: 299  },
};
