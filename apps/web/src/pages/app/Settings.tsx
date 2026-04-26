import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { ExternalLink, CreditCard, Shield, Trash2 } from 'lucide-react';
import { api } from '../../lib/api.js';
import { TIER_META, TIER_LIMITS } from '../../types/index.js';
import { Badge } from '../../components/ui/Badge.js';
import { Card, CardHeader, CardBody } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { PageSpinner } from '../../components/ui/Spinner.js';
import { Breadcrumb } from '../../components/layout/AppNav.js';
import { formatDate } from '../../lib/utils.js';

export function Settings() {
  const { installationId } = useParams<{ installationId: string }>();
  const id = installationId!;

  const { data: installation, isLoading } = useQuery({
    queryKey: ['installation', id],
    queryFn: () => api.installations.get(id),
  });

  if (isLoading) return <PageSpinner />;
  if (!installation) return <div className="text-gray-500">Not found.</div>;

  const tierMeta = TIER_META[installation.tier];
  const limits   = TIER_LIMITS[installation.tier];

  return (
    <div className="max-w-2xl">
      <Breadcrumb items={[
        { label: 'Dashboard', to: '/app/dashboard' },
        { label: installation.account_login, to: `/app/installations/${id}` },
        { label: 'Settings' },
      ]} />

      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Billing */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Billing & plan</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Current plan</p>
              <p className="text-xs text-gray-500">{limits.runsPerMonth.toLocaleString()} runs/month · {limits.reposPerInstallation} repos · {limits.concurrencyCap} concurrent</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={tierMeta.color}>{tierMeta.label}</Badge>
              <span className="text-sm font-semibold text-gray-900">${limits.priceMonthly}/mo</span>
            </div>
          </div>

          {installation.stripe_customer_id && (
            <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              Stripe customer: <code className="font-mono">{installation.stripe_customer_id}</code>
            </div>
          )}

          {installation.billing_cycle_anchor && (
            <div className="text-xs text-gray-400">
              Billing cycle: renews {formatDate(installation.billing_cycle_anchor)}
            </div>
          )}

          {installation.grace_period_ends_at && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Grace period active</strong> — Your last payment failed.
                Runs will continue until {formatDate(installation.grace_period_ends_at)}.
                Please update your payment method to avoid interruption.
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button size="sm" asChild>
              <a href="https://billing.stripe.com/p/login/test_example" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" /> Manage billing
              </a>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href="/pricing" target="_blank" rel="noopener noreferrer">
                Upgrade plan
              </a>
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Installation info */}
      <Card className="mb-4">
        <CardHeader>
          <h2 className="text-sm font-semibold text-gray-900">Installation info</h2>
        </CardHeader>
        <CardBody>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="py-2 text-gray-500 w-40">Account</td>
                <td className="py-2 font-medium text-gray-900">{installation.account_login}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Type</td>
                <td className="py-2 text-gray-700">{installation.account_type}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">GitHub ID</td>
                <td className="py-2 font-mono text-xs text-gray-500">{installation.github_id}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Internal ID</td>
                <td className="py-2 font-mono text-xs text-gray-500">{installation.id}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Installed</td>
                <td className="py-2 text-gray-700">{formatDate(installation.created_at)}</td>
              </tr>
              {installation.suspended_at && (
                <tr>
                  <td className="py-2 text-gray-500">Status</td>
                  <td className="py-2">
                    <Badge className="bg-red-100 text-red-700">Suspended</Badge>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader className="border-red-100">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Uninstall PreviewQA</p>
              <p className="text-xs text-gray-500">Removes the GitHub App. Run history is retained for 90 days.</p>
            </div>
            <Button
              variant="danger"
              size="sm"
              asChild
            >
              <a
                href={`https://github.com/settings/installations/${installation.github_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Uninstall on GitHub
              </a>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
