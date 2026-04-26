import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { GitBranch, ArrowRight, Settings, TrendingUp } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatRelative, formatPercent } from '../../lib/utils.js';
import { TIER_META, TIER_LIMITS } from '../../types/index.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { UsageBar } from '../../components/ui/UsageBar.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Breadcrumb } from '../../components/layout/AppNav.js';
import { RunsBarChart } from '../../components/charts/RunsBarChart.js';

export function InstallationDetail() {
  const { installationId } = useParams<{ installationId: string }>();
  const id = installationId!;

  const { data: installation, isLoading: loadingInst } = useQuery({
    queryKey: ['installation', id],
    queryFn: () => api.installations.get(id),
  });

  const { data: repos, isLoading: loadingRepos } = useQuery({
    queryKey: ['repos', id],
    queryFn: () => api.repos.list(id),
  });

  const { data: usage } = useQuery({
    queryKey: ['usage', id],
    queryFn: () => api.usage(id),
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics', id],
    queryFn: () => api.analytics.installation(id, 30),
    staleTime: 60_000,
  });

  if (loadingInst || loadingRepos) return <PageSpinner />;
  if (!installation) return <div className="text-gray-500">Installation not found.</div>;

  const tierMeta = TIER_META[installation.tier];
  const limits = TIER_LIMITS[installation.tier];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/app/dashboard' },
        { label: installation.account_login },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-bold">
            {installation.account_login.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{installation.account_login}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">{installation.account_type}</span>
              <Badge className={tierMeta.color}>{tierMeta.label}</Badge>
            </div>
          </div>
        </div>
        <Link
          to={`/app/installations/${id}/settings`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <Settings className="w-4 h-4" /> Settings
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Monthly runs" value={usage?.monthly_runs ?? '—'} sub={`of ${limits.runsPerMonth.toLocaleString()}`} />
        <StatCard label="Active repos" value={repos?.length ?? '—'} sub={`of ${limits.reposPerInstallation}`} />
        <StatCard label="Pass rate (30d)" value={analytics ? formatPercent(analytics.pass_rate) : '—'} sub={`${analytics?.total_runs ?? 0} runs`} />
        <StatCard label="Avg duration" value={analytics ? `${Math.round((analytics.avg_duration_ms ?? 0) / 1000)}s` : '—'} sub="completed runs" />
      </div>

      {/* Usage bars */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Usage this month</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <UsageBar
            label="Runs"
            value={usage?.monthly_runs ?? 0}
            max={limits.runsPerMonth}
          />
          <UsageBar
            label="Repositories"
            value={repos?.length ?? 0}
            max={limits.reposPerInstallation}
          />
        </CardBody>
      </Card>

      {/* Analytics trend */}
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

      {/* Repos */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Repositories</h2>
        </CardHeader>
        {!repos || repos.length === 0 ? (
          <CardBody>
            <EmptyState
              icon="📁"
              title="No repositories"
              description="Add repositories to this installation in GitHub."
            />
          </CardBody>
        ) : (
          <div className="divide-y divide-gray-100">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                to={`/app/installations/${id}/repos/${repo.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{repo.full_name}</p>
                    <p className="text-xs text-gray-400">Default: {repo.default_branch} · Updated {formatRelative(repo.updated_at)}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
