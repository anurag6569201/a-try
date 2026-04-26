import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ExternalLink, Image, FileSearch, Video, FileText, Brain } from 'lucide-react';
import { api } from '../../lib/api.js';
import {
  formatRelative, formatDuration, formatBytes,
  STATE_META, MODE_META, OUTCOME_META, FAILURE_META, ARTIFACT_META,
} from '../../lib/utils.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Breadcrumb } from '../../components/layout/AppNav.js';

const ARTIFACT_ICONS = {
  screenshot: <Image className="w-4 h-4" />,
  trace:      <FileSearch className="w-4 h-4" />,
  video:      <Video className="w-4 h-4" />,
  log:        <FileText className="w-4 h-4" />,
};

export function RunDetail() {
  const { installationId, repoId, runId } = useParams<{
    installationId: string; repoId: string; runId: string;
  }>();
  const iid = installationId!;
  const rid = repoId!;
  const rnid = runId!;

  const { data: installation } = useQuery({
    queryKey: ['installation', iid],
    queryFn: () => api.installations.get(iid),
  });
  const { data: repo } = useQuery({
    queryKey: ['repo', iid, rid],
    queryFn: () => api.repos.get(iid, rid),
  });
  const { data: run, isLoading: loadingRun } = useQuery({
    queryKey: ['run', iid, rid, rnid],
    queryFn: () => api.runs.get(iid, rid, rnid),
  });
  const { data: results } = useQuery({
    queryKey: ['results', rnid],
    queryFn: () => api.results(iid, rid, rnid),
  });
  const { data: artifacts } = useQuery({
    queryKey: ['artifacts', rnid],
    queryFn: () => api.artifacts(iid, rid, rnid),
  });
  const { data: traces } = useQuery({
    queryKey: ['traces', rnid],
    queryFn: () => api.traces(iid, rid, rnid),
  });

  if (loadingRun) return <PageSpinner />;
  if (!run) return <div className="text-gray-500">Run not found.</div>;

  const stateMeta = STATE_META[run.state];
  const modeMeta  = MODE_META[run.mode];
  const durationMs =
    run.completed_at && run.started_at
      ? new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()
      : null;

  const screenshots = artifacts?.filter((a) => a.kind === 'screenshot') ?? [];

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/app/dashboard' },
        { label: installation?.account_login ?? iid, to: `/app/installations/${iid}` },
        { label: repo?.full_name ?? rid, to: `/app/installations/${iid}/repos/${rid}` },
        { label: `Run ${rnid.slice(0, 8)}` },
      ]} />

      {/* Run header */}
      <div className="flex flex-wrap items-start gap-4 justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{rnid.slice(0, 8)}</h1>
            <Badge className={stateMeta.color} dot={stateMeta.dot}>{stateMeta.label}</Badge>
            <Badge className={modeMeta.color}>{modeMeta.label}</Badge>
          </div>
          <p className="text-sm text-gray-500">
            SHA {run.sha.slice(0, 7)} · triggered by <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{run.triggered_by}</code> · {formatRelative(run.created_at)}
          </p>
        </div>
        {run.preview_url && (
          <a
            href={run.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Preview URL
          </a>
        )}
      </div>

      {/* Timeline */}
      <Card className="mb-4">
        <CardHeader><h2 className="text-sm font-semibold text-gray-900">Timeline</h2></CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-gray-400">Created</p><p className="font-medium text-gray-900">{formatRelative(run.created_at)}</p></div>
            <div><p className="text-xs text-gray-400">Started</p><p className="font-medium text-gray-900">{formatRelative(run.started_at)}</p></div>
            <div><p className="text-xs text-gray-400">Completed</p><p className="font-medium text-gray-900">{formatRelative(run.completed_at)}</p></div>
            <div><p className="text-xs text-gray-400">Duration</p><p className="font-medium text-gray-900">{formatDuration(durationMs)}</p></div>
          </div>
        </CardBody>
      </Card>

      {/* Step outcomes */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Step outcomes</h2>
            <span className="text-xs text-gray-400">{results?.length ?? 0} results</span>
          </div>
        </CardHeader>
        {!results || results.length === 0 ? (
          <CardBody><EmptyState icon="📋" title="No results yet" /></CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Outcome</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Summary</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r) => {
                  const outcomeMeta  = OUTCOME_META[r.outcome];
                  const failMeta = r.failure_category ? FAILURE_META[r.failure_category] : null;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><Badge className={outcomeMeta.color}>{outcomeMeta.label}</Badge></td>
                      <td className="px-4 py-3">
                        {failMeta ? <Badge className={failMeta.color}>{failMeta.label}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{r.summary ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDuration(r.duration_ms)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <Card className="mb-4">
          <CardHeader><h2 className="text-sm font-semibold text-gray-900">Screenshots</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {screenshots.map((a) => (
                <a
                  key={a.id}
                  href={a.blob_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow group"
                >
                  <div className="bg-gray-100 aspect-video flex items-center justify-center text-gray-400">
                    <Image className="w-8 h-8" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-700 truncate">{a.filename}</p>
                    <p className="text-xs text-gray-400">{formatBytes(a.size_bytes)}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* All artifacts */}
      <Card className="mb-4">
        <CardHeader><h2 className="text-sm font-semibold text-gray-900">All artifacts</h2></CardHeader>
        {!artifacts || artifacts.length === 0 ? (
          <CardBody><EmptyState icon="📎" title="No artifacts" /></CardBody>
        ) : (
          <div className="divide-y divide-gray-50">
            {artifacts.map((a) => {
              const meta = ARTIFACT_META[a.kind];
              return (
                <div key={a.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{ARTIFACT_ICONS[a.kind]}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{a.filename}</p>
                      <p className="text-xs text-gray-400">{meta.label} · {formatBytes(a.size_bytes)}</p>
                    </div>
                  </div>
                  <a
                    href={a.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Model traces */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-900">Model traces</h2>
          </div>
        </CardHeader>
        {!traces || traces.length === 0 ? (
          <CardBody><EmptyState icon="🧠" title="No model traces" /></CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Prompt</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Model</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">In tokens</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Out tokens</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Latency</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {traces.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs font-mono text-gray-700">{t.prompt_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.model}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.input_tokens ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{t.output_tokens ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDuration(t.latency_ms)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatRelative(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
