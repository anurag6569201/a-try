import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Settings2, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api.js';
import type { RunFilters, RunsPage } from '../../lib/api.js';
import { formatRelative, formatDuration, formatPercent, STATE_META, MODE_META } from '../../lib/utils.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { Breadcrumb } from '../../components/layout/AppNav.js';
import { RunsBarChart } from '../../components/charts/RunsBarChart.js';

const STATE_OPTIONS = ['', 'completed', 'failed', 'canceled', 'running', 'queued', 'blocked_environment'];
const MODE_OPTIONS  = ['', 'smoke', 'instruction', 'hybrid'];

export function RepoDetail() {
  const { installationId, repoId } = useParams<{ installationId: string; repoId: string }>();
  const iid = installationId!;
  const rid = repoId!;

  const [filters, setFilters] = useState<RunFilters>({ limit: 50 });

  const { data: installation } = useQuery({
    queryKey: ['installation', iid],
    queryFn: () => api.installations.get(iid),
  });
  const { data: repo, isLoading: loadingRepo } = useQuery({
    queryKey: ['repo', iid, rid],
    queryFn: () => api.repos.get(iid, rid),
  });
  const { data: analytics } = useQuery({
    queryKey: ['repo-analytics', iid, rid],
    queryFn: () => api.analytics.repo(iid, rid, 30),
    staleTime: 60_000,
  });
  const {
    data: pages,
    isLoading: loadingRuns,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['runs', iid, rid, filters],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      api.runs.list(iid, rid, { ...filters, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: RunsPage) => last.nextCursor ?? undefined,
  });

  if (loadingRepo) return <PageSpinner />;
  if (!repo) return <div className="text-gray-500">Repository not found.</div>;

  const runs = pages?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/app/dashboard' },
        { label: installation?.account_login ?? iid, to: `/app/installations/${iid}` },
        { label: repo.full_name },
      ]} />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{repo.full_name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Branch: {repo.default_branch}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={`https://github.com/${repo.full_name}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ExternalLink className="w-4 h-4" /> GitHub
          </a>
          <Link to={`/app/installations/${iid}/repos/${rid}/config`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <Settings2 className="w-4 h-4" /> Config
          </Link>
        </div>
      </div>

      {/* Analytics summary row */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Runs (30d)" value={String(analytics.total_runs)} />
          <StatCard label="Pass rate" value={formatPercent(analytics.pass_rate)} />
          <StatCard label="Passed" value={String(analytics.state_breakdown['completed'] ?? 0)} sub="completed" />
          <StatCard label="Failed"  value={String(analytics.state_breakdown['failed'] ?? 0)}    sub="failed" />
        </div>
      )}

      {/* Trend chart */}
      {analytics && analytics.runs_per_day.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-900">Runs over time (30d)</h2>
            </div>
          </CardHeader>
          <CardBody>
            <RunsBarChart data={analytics.runs_per_day} />
          </CardBody>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-4">
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700"
              value={filters.state ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value || undefined, cursor: undefined }))}
            >
              {STATE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s || 'All states'}</option>
              ))}
            </select>
            <select
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700"
              value={filters.mode ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, mode: e.target.value || undefined, cursor: undefined }))}
            >
              {MODE_OPTIONS.map((m) => (
                <option key={m} value={m}>{m || 'All modes'}</option>
              ))}
            </select>
            <input
              type="date"
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700"
              value={filters.since ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, since: e.target.value || undefined, cursor: undefined }))}
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700"
              value={filters.until ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, until: e.target.value || undefined, cursor: undefined }))}
            />
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Run list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Run history</h2>
            <span className="text-xs text-gray-400">{runs.length} shown</span>
          </div>
        </CardHeader>
        {loadingRuns ? (
          <CardBody><PageSpinner /></CardBody>
        ) : runs.length === 0 ? (
          <CardBody>
            <EmptyState icon="🏃" title="No runs" description="Open a pull request to trigger the first run." />
          </CardBody>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Run</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">State</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Mode</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">SHA</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Triggered</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Duration</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {runs.map((run) => {
                    const sm = STATE_META[run.state];
                    const mm = MODE_META[run.mode];
                    const dur = run.completed_at && run.started_at
                      ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
                      : null;
                    return (
                      <tr key={run.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link to={`/app/installations/${iid}/repos/${rid}/runs/${run.id}`}
                            className="font-mono text-xs text-brand-600 hover:underline">
                            {run.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={sm.color} dot={sm.dot}>{sm.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={mm.color}>{mm.label}</Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{run.sha.slice(0, 7)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{run.triggered_by}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{formatDuration(dur)}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(run.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasNextPage && (
              <div className="px-4 py-3 border-t border-gray-100">
                <Button variant="ghost" size="sm" loading={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
