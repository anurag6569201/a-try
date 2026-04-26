import type { RunState, RunMode, RunOutcome, BillingTier, ArtifactKind, FailureCategory } from '../types/index.js';

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export const STATE_META: Record<RunState, { label: string; color: string; dot: string }> = {
  queued:              { label: 'Queued',           color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  waiting_for_preview: { label: 'Waiting',          color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-400' },
  planning:            { label: 'Planning',          color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400' },
  running:             { label: 'Running',           color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500 animate-pulse' },
  analyzing:           { label: 'Analyzing',         color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  reporting:           { label: 'Reporting',         color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  completed:           { label: 'Completed',         color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  failed:              { label: 'Failed',            color: 'bg-red-100 text-red-700',     dot: 'bg-red-500' },
  blocked_environment: { label: 'Env Blocked',       color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  needs_human:         { label: 'Needs Review',      color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  canceled:            { label: 'Canceled',          color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-300' },
};

export const MODE_META: Record<RunMode, { label: string; color: string }> = {
  smoke:       { label: 'Smoke',       color: 'bg-sky-100 text-sky-700' },
  instruction: { label: 'Instruction', color: 'bg-violet-100 text-violet-700' },
  hybrid:      { label: 'Hybrid',      color: 'bg-teal-100 text-teal-700' },
};

export const OUTCOME_META: Record<RunOutcome, { label: string; color: string }> = {
  pass:    { label: 'Pass',    color: 'bg-green-100 text-green-700' },
  fail:    { label: 'Fail',    color: 'bg-red-100 text-red-700' },
  blocked: { label: 'Blocked', color: 'bg-orange-100 text-orange-700' },
  skipped: { label: 'Skipped', color: 'bg-gray-100 text-gray-500' },
};

export const TIER_META: Record<BillingTier, { label: string; color: string }> = {
  free:    { label: 'Free',    color: 'bg-gray-100 text-gray-600' },
  starter: { label: 'Starter', color: 'bg-blue-100 text-blue-700' },
  growth:  { label: 'Growth',  color: 'bg-green-100 text-green-700' },
  team:    { label: 'Team',    color: 'bg-purple-100 text-purple-700' },
};

export const ARTIFACT_META: Record<ArtifactKind, { label: string; icon: string }> = {
  screenshot: { label: 'Screenshot', icon: '🖼️' },
  trace:      { label: 'Trace',      icon: '🔍' },
  video:      { label: 'Video',      icon: '🎥' },
  log:        { label: 'Log',        icon: '📄' },
};

export const FAILURE_META: Record<FailureCategory, { label: string; color: string }> = {
  product_bug:        { label: 'Product Bug',   color: 'bg-red-100 text-red-700' },
  test_bug:           { label: 'Test Bug',      color: 'bg-orange-100 text-orange-700' },
  environment_issue:  { label: 'Env Issue',     color: 'bg-yellow-100 text-yellow-700' },
  flaky:              { label: 'Flaky',         color: 'bg-amber-100 text-amber-700' },
  needs_clarification:{ label: 'Needs Review',  color: 'bg-gray-100 text-gray-600' },
};
