import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Settings2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatRelative, formatDuration, STATE_META, MODE_META } from '../../lib/utils.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Breadcrumb } from '../../components/layout/AppNav.js';
import { RunStateChart } from '../../components/charts/RunStateChart.js';

export function RepoDetail() {
  const { installationId, repoId } = useParams<{ installationId: string; repoId: string }>();
  const iid = installationId!;
  const rid = repoId!;

  const { data: installation } = useQuery({
    queryKey: ['installation', iid],
    queryFn: () => api.installations.get(iid),
  });

  const { data: repo, isLoading: loadingRepo } = useQuery({
    queryKey: ['repo', iid, rid],
    queryFn: () => api.repos.get(iid, rid),
  });

  const { data: runs, isLoading: loadingRuns } = useQuery({
    queryKey: ['runs', iid, rid],
    queryFn: () => api.runs.list(iid, rid),
  });

  if (loadingRepo || loadingRuns) return <PageSpinner />;
  if (!repo) return <div className="text-gray-500">Repository not found.</div>;

  const passCount  = runs?.filter((r) => r.state === 'completed').length ?? 0;
  const failCount  = runs?.filter((r) => r.state === 'failed').length ?? 0;

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
          <a
            href={`https://github.com/${repo.full_name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="w-4 h-4" /> GitHub
          </a>
          <Link
            to={`/app/installations/${iid}/repos/${rid}/config`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <Settings2 className="w-4 h-4" /> Config
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Run history</h2>
                <span className="text-xs text-gray-400">{runs?.length ?? 0} total · {passCount} passed · {failCount} failed</span>
              </div>
            </CardHeader>
            {!runs || runs.length === 0 ? (
              <CardBody>
                <EmptyState icon="🏃" title="No runs yet" description="Open a pull request to trigger the first run." />
              </CardBody>
            ) : (
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
                      const stateMeta = STATE_META[run.state];
                      const modeMeta = MODE_META[run.mode];
                      const durationMs =
                        run.completed_at && run.started_at
                          ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
                          : null;
                      return (
                        <tr key={run.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link
                              to={`/app/installations/${iid}/repos/${rid}/runs/${run.id}`}
                              className="font-mono text-xs text-brand-600 hover:underline"
                            >
                              {run.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={stateMeta.color} dot={stateMeta.dot}>
                              {stateMeta.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={modeMeta.color}>{modeMeta.label}</Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{run.sha.slice(0, 7)}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{run.triggered_by}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{formatDuration(durationMs)}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(run.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Chart */}
        {runs && runs.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-900">State breakdown</h2>
            </CardHeader>
            <CardBody>
              <RunStateChart runs={runs} />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
