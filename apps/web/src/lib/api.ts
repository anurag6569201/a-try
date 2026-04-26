import type { Installation, Repository, Run, Result, Artifact, ModelTrace, UsageStats } from '../types/index.js';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  installations: {
    list: () => get<Installation[]>('/installations'),
    get:  (id: string) => get<Installation>(`/installations/${id}`),
  },
  repos: {
    list:   (installationId: string) => get<Repository[]>(`/installations/${installationId}/repos`),
    get:    (installationId: string, repoId: string) => get<Repository>(`/installations/${installationId}/repos/${repoId}`),
    config: (installationId: string, repoId: string, config: Record<string, unknown>) =>
      post<Repository>(`/installations/${installationId}/repos/${repoId}/config`, { config }),
  },
  runs: {
    list: (installationId: string, repoId: string) =>
      get<Run[]>(`/installations/${installationId}/repos/${repoId}/runs`),
    get:  (installationId: string, repoId: string, runId: string) =>
      get<Run>(`/installations/${installationId}/repos/${repoId}/runs/${runId}`),
  },
  results:   (installationId: string, repoId: string, runId: string) =>
    get<Result[]>(`/installations/${installationId}/repos/${repoId}/runs/${runId}/results`),
  artifacts: (installationId: string, repoId: string, runId: string) =>
    get<Artifact[]>(`/installations/${installationId}/repos/${repoId}/runs/${runId}/artifacts`),
  traces:    (installationId: string, repoId: string, runId: string) =>
    get<ModelTrace[]>(`/installations/${installationId}/repos/${repoId}/runs/${runId}/traces`),
  usage:     (installationId: string) => get<UsageStats>(`/installations/${installationId}/usage`),
};
