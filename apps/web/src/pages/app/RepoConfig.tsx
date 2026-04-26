import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { Breadcrumb } from '../../components/layout/AppNav.js';
import type { Repository } from '../../types/index.js';

const CONFIG_TEMPLATE = `version: 1

# Vercel configuration
# vercel:
#   projectName: my-vercel-project
#   teamId: team_abc123

# Default mode when no QA block present: smoke | hybrid
# defaultMode: smoke

# Per-step timeout (ms, default 30000)
# stepTimeoutMs: 30000

# Max test cases per run (default 20)
# maxTestCases: 20

# Login profiles
# loginProfiles:
#   - name: admin-user
#     secretName: previewqa-login-admin
`;

function configToJson(config: Record<string, unknown>): string {
  const s = JSON.stringify(config, null, 2);
  return s === '{}' ? CONFIG_TEMPLATE : s;
}

interface EditorProps {
  repo: Repository;
  iid: string;
  rid: string;
  onCancel: () => void;
}

function ConfigEditor({ repo, iid, rid, onCancel }: EditorProps) {
  const queryClient = useQueryClient();
  const [json, setJson] = useState(() => configToJson(repo.config));
  const [parseError, setParseError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleChange = (value: string) => {
    setJson(value);
    setSaved(false);
    try {
      JSON.parse(value);
      setParseError(null);
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const mutation = useMutation({
    mutationFn: (config: Record<string, unknown>) => api.repos.config(iid, rid, config),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repo', iid, rid] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSave = () => {
    try {
      const parsed = JSON.parse(json) as Record<string, unknown>;
      mutation.mutate(parsed);
    } catch {
      // parse error already shown
    }
  };

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">.previewqa/config.yaml</code> — JSON editor
            </h2>
            {parseError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5" /> Invalid JSON
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody>
          <textarea
            value={json}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full h-80 font-mono text-sm bg-gray-950 text-green-300 p-4 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            spellCheck={false}
          />
          {parseError && (
            <p className="mt-2 text-xs text-red-600 font-mono">{parseError}</p>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!!parseError}
          loading={mutation.isPending}
        >
          Save config
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </>
  );
}

export function RepoConfig() {
  const { installationId, repoId } = useParams<{ installationId: string; repoId: string }>();
  const iid = installationId!;
  const rid = repoId!;
  const navigate = useNavigate();

  const { data: installation } = useQuery({
    queryKey: ['installation', iid],
    queryFn: () => api.installations.get(iid),
  });
  const { data: repo, isLoading } = useQuery({
    queryKey: ['repo', iid, rid],
    queryFn: () => api.repos.get(iid, rid),
  });

  if (isLoading) return <PageSpinner />;
  if (!repo) return <div className="text-gray-500">Repository not found.</div>;

  return (
    <div className="max-w-3xl">
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/app/dashboard' },
        { label: installation?.account_login ?? iid, to: `/app/installations/${iid}` },
        { label: repo.full_name, to: `/app/installations/${iid}/repos/${rid}` },
        { label: 'Config' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Repo config</h1>
        <p className="text-sm text-gray-500">{repo.full_name}</p>
      </div>

      <ConfigEditor
        key={repo.id}
        repo={repo}
        iid={iid}
        rid={rid}
        onCancel={() => navigate(`/app/installations/${iid}/repos/${rid}`)}
      />

      <Card className="mt-8">
        <CardHeader><h2 className="text-sm font-semibold text-gray-900">About this config</h2></CardHeader>
        <CardBody className="prose-doc text-sm">
          <p>
            This config is synced to <code>.previewqa/config.yaml</code> in your repository.
            Changes take effect on the next PR event.
          </p>
          <p className="mt-2">
            See the <a href="/docs/config" target="_blank" rel="noopener noreferrer">config reference</a> for all available fields.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
