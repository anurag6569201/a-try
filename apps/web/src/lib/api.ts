import type {
  Installation, Repository, Run, Result, Artifact, ModelTrace, UsageStats,
} from '../types/index.js';

export const BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, { credentials: 'include' });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized'); }
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const authUrl = `${BASE}/auth/github`;

export interface RunsPage { data: Run[]; nextCursor: string | null; hasMore: boolean }
export interface RunFilters { state?: string; mode?: string; since?: string; until?: string; limit?: number; cursor?: string }

export interface Analytics {
  period_days: number;
  total_runs: number;
  pass_rate: number;
  avg_duration_ms: number;
  active_repos: number;
  runs_per_day: { day: string; count: number; passed: number; failed: number }[];
  mode_breakdown: Record<string, number>;
  outcome_breakdown: Record<string, number>;
  failure_categories: { category: string; count: number }[];
}

export interface RepoAnalytics {
  period_days: number;
  total_runs: number;
  pass_rate: number;
  runs_per_day: { day: string; count: number; passed: number; failed: number }[];
  state_breakdown: Record<string, number>;
  failure_categories: { category: string; count: number }[];
}

export const api = {
  installations: {
    list: () => get<Installation[]>('/installations'),
    get:  (id: string) => get<Installation>(`/installations/${id}`),
  },
  repos: {
    list:   (iid: string) => get<Repository[]>(`/installations/${iid}/repos`),
    get:    (iid: string, rid: string) => get<Repository>(`/installations/${iid}/repos/${rid}`),
    config: (iid: string, rid: string, config: Record<string, unknown>) =>
      post<Repository>(`/installations/${iid}/repos/${rid}/config`, { config }),
  },
  runs: {
    list: (iid: string, rid: string, filters?: RunFilters) => {
      const params = new URLSearchParams();
      if (filters?.limit)  params.set('limit',  String(filters.limit));
      if (filters?.cursor) params.set('cursor', filters.cursor);
      if (filters?.state)  params.set('state',  filters.state);
      if (filters?.mode)   params.set('mode',   filters.mode);
      if (filters?.since)  params.set('since',  filters.since);
      if (filters?.until)  params.set('until',  filters.until);
      const qs = params.toString();
      return get<RunsPage>(`/installations/${iid}/repos/${rid}/runs${qs ? `?${qs}` : ''}`);
    },
    get: (iid: string, rid: string, runId: string) =>
      get<Run>(`/installations/${iid}/repos/${rid}/runs/${runId}`),
  },
  results:   (iid: string, rid: string, runId: string) =>
    get<Result[]>(`/installations/${iid}/repos/${rid}/runs/${runId}/results`),
  artifacts: (iid: string, rid: string, runId: string) =>
    get<Artifact[]>(`/installations/${iid}/repos/${rid}/runs/${runId}/artifacts`),
  traces:    (iid: string, rid: string, runId: string) =>
    get<ModelTrace[]>(`/installations/${iid}/repos/${rid}/runs/${runId}/traces`),
  usage:     (iid: string) => get<UsageStats>(`/installations/${iid}/usage`),
  analytics: {
    installation: (iid: string, days = 30) =>
      get<Analytics>(`/installations/${iid}/analytics?days=${days}`),
    repo: (iid: string, rid: string, days = 30) =>
      get<RepoAnalytics>(`/installations/${iid}/repos/${rid}/analytics?days=${days}`),
  },

  streamRunUrl: (iid: string, rid: string, runId: string) =>
    `${BASE}/api/installations/${iid}/repos/${rid}/runs/${runId}/stream`,
};
