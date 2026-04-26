import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Plus, Building2, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api.js';
import { formatRelative } from '../../lib/utils.js';
import { TIER_META, TIER_LIMITS } from '../../types/index.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card, CardBody } from '../../components/ui/Card.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import { Button } from '../../components/ui/Button.js';

export function Dashboard() {
  const { data: installations, isLoading } = useQuery({
    queryKey: ['installations'],
    queryFn: api.installations.list,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">{installations?.length ?? 0} installation{installations?.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button size="sm" asChild>
          <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
            <Plus className="w-4 h-4" /> Add installation
          </a>
        </Button>
      </div>

      {!installations || installations.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<Building2 className="w-10 h-10 text-gray-300" />}
              title="No installations yet"
              description="Install the PreviewQA GitHub App to start monitoring your Vercel preview deployments."
              action={
                <Button asChild>
                  <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
                    Install on GitHub
                  </a>
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {installations.map((inst) => {
            const tierMeta = TIER_META[inst.tier];
            const limits = TIER_LIMITS[inst.tier];
            return (
              <Link key={inst.id} to={`/app/installations/${inst.id}`} className="group block">
                <Card className="p-5 hover:shadow-md transition-shadow group-hover:border-brand-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm">
                        {inst.account_login.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{inst.account_login}</p>
                        <p className="text-xs text-gray-400">{inst.account_type}</p>
                      </div>
                    </div>
                    <Badge className={tierMeta.color}>{tierMeta.label}</Badge>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center justify-between mt-4">
                    <span>Up to {limits.runsPerMonth.toLocaleString()} runs/mo</span>
                    <div className="flex items-center gap-1 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>View</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-300 mt-1">Installed {formatRelative(inst.created_at)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
