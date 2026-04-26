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

export type ReviewScore = 'lgtm' | 'minor' | 'major' | 'block';
export type ReviewSeverity = 'error' | 'warning' | 'info';
export type ReviewAgent =
  | 'security' | 'logic' | 'type_safety' | 'performance'
  | 'test_coverage' | 'architecture' | 'documentation' | 'synthesizer';

export interface ReviewRecord {
  id: string;
  pull_request_id: string;
  score: ReviewScore;
  risk_level: string;
  agents_run: number;
  findings_count: number;
  github_comment_id: number | null;
  github_review_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewFinding {
  id: string;
  review_id: string;
  agent: ReviewAgent;
  severity: ReviewSeverity;
  file: string | null;
  line: number | null;
  title: string;
  body: string;
  suggestion: string | null;
  confidence: string;
  created_at: string;
}

export const REVIEW_SCORE_META: Record<ReviewScore, { label: string; color: string; icon: string }> = {
  lgtm:  { label: 'LGTM',  color: 'bg-green-100 text-green-700',   icon: '✅' },
  minor: { label: 'Minor', color: 'bg-yellow-100 text-yellow-700', icon: '💛' },
  major: { label: 'Major', color: 'bg-orange-100 text-orange-700', icon: '⚠️' },
  block: { label: 'Block', color: 'bg-red-100 text-red-700',       icon: '🚫' },
};

export const REVIEW_SEVERITY_META: Record<ReviewSeverity, { label: string; color: string }> = {
  error:   { label: 'Error',   color: 'bg-red-100 text-red-700'       },
  warning: { label: 'Warning', color: 'bg-yellow-100 text-yellow-700' },
  info:    { label: 'Info',    color: 'bg-blue-100 text-blue-700'     },
};

export const REVIEW_AGENT_META: Record<ReviewAgent, { label: string; color: string }> = {
  security:      { label: 'Security',     color: 'bg-red-50 text-red-700'       },
  logic:         { label: 'Logic',        color: 'bg-orange-50 text-orange-700' },
  type_safety:   { label: 'Type Safety',  color: 'bg-amber-50 text-amber-700'   },
  performance:   { label: 'Performance',  color: 'bg-yellow-50 text-yellow-700' },
  test_coverage: { label: 'Tests',        color: 'bg-green-50 text-green-700'   },
  architecture:  { label: 'Architecture', color: 'bg-blue-50 text-blue-700'     },
  documentation: { label: 'Docs',         color: 'bg-purple-50 text-purple-700' },
  synthesizer:   { label: 'Synthesizer',  color: 'bg-gray-100 text-gray-700'    },
};

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
