import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { TIER_LIMITS } from '../types/index.js';

const PLANS = [
  {
    tier: 'free' as const,
    name: 'Free',
    price: 0,
    description: 'For solo developers and side projects.',
    cta: 'Get started free',
    ctaHref: 'https://github.com/apps/preview-qa',
    highlighted: false,
  },
  {
    tier: 'starter' as const,
    name: 'Starter',
    price: 29,
    description: 'For small teams shipping actively.',
    cta: 'Start 14-day trial',
    ctaHref: 'https://github.com/apps/preview-qa',
    highlighted: false,
  },
  {
    tier: 'growth' as const,
    name: 'Growth',
    price: 99,
    description: 'For growing teams with multiple repos.',
    cta: 'Start 14-day trial',
    ctaHref: 'https://github.com/apps/preview-qa',
    highlighted: true,
  },
  {
    tier: 'team' as const,
    name: 'Team',
    price: 299,
    description: 'For organizations with full automation.',
    cta: 'Start 14-day trial',
    ctaHref: 'https://github.com/apps/preview-qa',
    highlighted: false,
  },
];

type FeatureRow = {
  label: string;
  values: Array<string | boolean>;
};

const FEATURE_ROWS: FeatureRow[] = [
  { label: 'Runs per month',            values: ['50', '500', '2,000', '10,000'] },
  { label: 'Repos per installation',    values: ['1', '5', '20', '100'] },
  { label: 'Concurrent runs',           values: ['2', '5', '10', '20'] },
  { label: 'Smoke tests',               values: [true, true, true, true] },
  { label: 'Instruction mode (YAML)',   values: [false, true, true, true] },
  { label: 'Hybrid mode',               values: [false, true, true, true] },
  { label: 'AI failure classification', values: [false, true, true, true] },
  { label: 'AI plan suggestions',       values: [false, false, true, true] },
  { label: 'Login profiles',            values: [false, true, true, true] },
  { label: 'Fork policy enforcement',   values: [true, true, true, true] },
  { label: 'Screenshot artifacts',      values: [true, true, true, true] },
  { label: 'Trace artifacts',           values: [false, true, true, true] },
  { label: 'Video capture',             values: [false, false, true, true] },
  { label: 'Audit log',                 values: [false, false, true, true] },
  { label: 'Dashboard access',          values: [true, true, true, true] },
  { label: 'Priority support',          values: [false, false, true, true] },
  { label: 'SLA',                       values: [false, false, false, true] },
];

export function Pricing() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Start free. Upgrade when your team grows. All plans include the GitHub App, dashboard, and PR comments.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-16">
        {PLANS.map((plan) => {
          const limits = TIER_LIMITS[plan.tier];
          return (
            <div
              key={plan.tier}
              className={
                plan.highlighted
                  ? 'bg-brand-600 text-white rounded-2xl p-6 shadow-xl ring-2 ring-brand-500 relative'
                  : 'bg-white border border-gray-200 rounded-2xl p-6 shadow-sm'
              }
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-4">
                <p className={`text-sm font-medium mb-1 ${plan.highlighted ? 'text-brand-200' : 'text-gray-500'}`}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-brand-200' : 'text-gray-500'}`}>/mo</span>
                </div>
                <p className={`text-xs mt-2 ${plan.highlighted ? 'text-brand-100' : 'text-gray-500'}`}>
                  {plan.description}
                </p>
              </div>
              <div className="space-y-1.5 mb-6 text-sm">
                <p>{limits.runsPerMonth.toLocaleString()} runs/month</p>
                <p>{limits.reposPerInstallation} {limits.reposPerInstallation === 1 ? 'repo' : 'repos'}</p>
                <p>{limits.concurrencyCap} concurrent</p>
              </div>
              <Button
                variant={plan.highlighted ? 'secondary' : 'primary'}
                className={plan.highlighted ? 'w-full bg-white text-brand-700 border-0 hover:bg-brand-50' : 'w-full'}
                asChild
              >
                <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer">{plan.cta}</a>
              </Button>
            </div>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Full feature comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.tier} className={`px-6 py-3 font-semibold text-center ${p.highlighted ? 'text-brand-600' : 'text-gray-700'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-gray-700">{row.label}</td>
                  {row.values.map((v, j) => (
                    <td key={j} className="px-6 py-3 text-center">
                      {typeof v === 'boolean' ? (
                        v
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          : <XCircle className="w-4 h-4 text-gray-300 mx-auto" />
                      ) : (
                        <span className="text-gray-700 font-medium">{v}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently asked questions</h2>
        <div className="space-y-6">
          {[
            {
              q: 'What counts as a "run"?',
              a: 'One run = one Playwright test session triggered by a PR event or /qa command. A run can execute multiple test steps/cases.',
            },
            {
              q: 'Do you support repos that aren\'t on Vercel?',
              a: 'Not yet. We currently support Vercel preview deployments. GitHub deployment status event support is on the roadmap.',
            },
            {
              q: 'What happens if I exceed my monthly run limit?',
              a: 'New runs are blocked and a CTA comment is posted to the PR. Existing runs complete normally. You can upgrade at any time.',
            },
            {
              q: 'Can I use my own Playwright setup?',
              a: 'PreviewQA runs its own Playwright instance in Azure Container Apps. You write steps in YAML — no test file needed. Custom runner support is on the roadmap.',
            },
            {
              q: 'Is the free tier really free forever?',
              a: 'Yes. 50 runs/month, 1 repo, no time limit. We won\'t grandfather you out of it.',
            },
          ].map((faq) => (
            <div key={faq.q} className="border-b border-gray-100 pb-6">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
