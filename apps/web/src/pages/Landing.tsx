import { Link } from 'react-router-dom';
import { CheckCircle2, Zap, GitPullRequest, ShieldCheck, BarChart2, Clock, ArrowRight, Bot, Code2, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../components/ui/Button.js';

const FEATURES = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Zero config to first run',
    desc: 'Install the GitHub App and get a Playwright smoke test on your next PR — no code changes required.',
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: 'AI code review — 7 agents',
    desc: 'Security, logic, type-safety, performance, test coverage, architecture, and docs agents review every PR in parallel.',
  },
  {
    icon: <GitPullRequest className="w-5 h-5" />,
    title: 'Structured test blocks',
    desc: 'Drop a YAML block in your PR description. PreviewQA runs exactly those steps against your Vercel preview.',
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: 'AI failure classification',
    desc: 'Every failure is classified: product bug, test bug, environment issue, or flaky — so you fix the right thing.',
  },
  {
    icon: <BarChart2 className="w-5 h-5" />,
    title: 'Run history & artifacts',
    desc: 'Screenshots, traces, and AI summaries are stored per-run so you can diff what changed between deploys.',
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: '/qa rerun in seconds',
    desc: 'Comment /qa rerun on any PR. PreviewQA cancels the old run and starts fresh against the latest SHA.',
  },
  {
    icon: <CheckCircle2 className="w-5 h-5" />,
    title: 'Fork-safe by default',
    desc: 'Fork PRs are automatically downgraded to smoke-only. Credentials never leave your installation.',
  },
];

const STATS = [
  { value: '< 2 min', label: 'median review time' },
  { value: '7', label: 'AI agents per PR' },
  { value: '50', label: 'free runs / month' },
  { value: '0', label: 'config files needed' },
];

const FAQS = [
  {
    q: 'Does it work with any framework?',
    a: 'PreviewQA works with any app that deploys to a URL — Vercel, Netlify, Railway, or your own infra. The Playwright runner hits a live URL so the framework is irrelevant.',
  },
  {
    q: 'What happens on fork PRs?',
    a: 'Fork PRs are automatically downgraded to smoke-only mode. No secrets leave your installation. The AI review still runs but has read-only access to the diff.',
  },
  {
    q: 'How is the AI review different from a linter?',
    a: 'Linters check syntax and style rules. Our agents reason about intent — they find race conditions, missing awaits, SQL injection, and architectural violations that no linter catches.',
  },
  {
    q: 'Can I write custom test steps?',
    a: 'Yes. Drop a YAML block in your PR description between <!-- previewqa:start --> tags. You get full Playwright actions: navigate, fill, click, assert_visible, screenshot, and login profiles.',
  },
  {
    q: 'Is there a self-hosted option?',
    a: 'Not yet — PreviewQA is cloud-only for now. The Pro plan adds private runner support on your own infrastructure. Reach out if you have specific compliance requirements.',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Install the GitHub App', desc: 'One click in GitHub Marketplace. Authorize the repos you want to monitor.' },
  { step: '2', title: 'Open a pull request', desc: 'PreviewQA detects the Vercel preview URL and waits for the deployment to go live.' },
  { step: '3', title: 'Tests run automatically', desc: 'Playwright runs your QA block (or a smoke test if none exists) against the preview URL.' },
  { step: '4', title: 'Results in your PR', desc: 'A sticky comment shows pass/fail per step with screenshots and an AI failure summary.' },
];

const TESTIMONIALS = [
  {
    quote: "We caught a checkout regression on a Friday deploy before it hit production. Saved us a weekend incident.",
    name: "Sarah M.", role: "Engineering Lead", company: "Acme Corp",
  },
  {
    quote: "The /qa rerun command is genuinely delightful. We run it after every fix and it's like having a QA engineer on-call.",
    name: "James K.", role: "Senior Engineer", company: "StartupXYZ",
  },
  {
    quote: "Setting up was literally 3 minutes. I installed the app, pushed a PR, and there was a Playwright test running.",
    name: "Priya R.", role: "Staff Engineer", company: "DevShop",
  },
];

function FaqList() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed">{faq.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  return (
    <div className="text-gray-600">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-28 text-center relative">
        {/* Subtle gradient blob */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-100/40 rounded-full blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-brand-200 tracking-wide uppercase">
          <Zap className="w-3 h-3" /> AI-powered · 7-agent code review · Zero config
        </div>
        <h1 className="text-5xl md:text-[64px] font-bold text-gray-900 leading-[1.1] tracking-tight mb-6">
          Catch bugs before<br />
          <span className="text-brand-600">they reach production</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed">
          PreviewQA runs Playwright tests and AI code review on every Vercel preview.
          GitHub Check, PR comment, inline annotations — in minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
              Install on GitHub — it's free
            </a>
          </Button>
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">Free tier · 50 runs/month · No credit card · No config required</p>

        {/* Mock terminal */}
        <div className="mt-16 max-w-3xl mx-auto bg-gray-900 rounded-2xl shadow-2xl overflow-hidden text-left">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="ml-2 text-xs text-gray-400">PreviewQA — PR #142</span>
          </div>
          <div className="p-5 font-mono text-sm space-y-1">
            <p className="text-green-400">✓ Preview URL resolved: https://myapp-pr-142.vercel.app</p>
            <p className="text-blue-400">→ Running 3 test cases (hybrid mode)</p>
            <p className="text-gray-300">&nbsp;&nbsp;✓ navigate /checkout — 1.2s</p>
            <p className="text-gray-300">&nbsp;&nbsp;✓ assert_visible [data-testid="cart-summary"] — 0.4s</p>
            <p className="text-red-400">&nbsp;&nbsp;✗ click [data-testid="pay-now"] — selector not found</p>
            <p className="text-amber-400">⚠ AI: This looks like a product_bug — the pay button was removed in this PR.</p>
            <p className="text-gray-500">&nbsp;&nbsp;Suggested fix: Check if data-testid="pay-now" was renamed.</p>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-brand-600 tracking-tight">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Everything you need, nothing you don't</h2>
          <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
            PreviewQA is a focused tool. It does one thing: runs your tests on every preview deploy and tells you what broke.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">How it works</h2>
        <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">From install to first AI-reviewed PR in under 3 minutes.</p>
        <div className="grid md:grid-cols-4 gap-0">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.step} className="relative flex flex-col items-center text-center px-4">
              {/* connector line */}
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-6 left-1/2 w-full h-px bg-brand-100" />
              )}
              <div className="relative z-10 w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center text-lg font-bold mb-4 shadow-md shadow-brand-200">
                {step.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* YAML block demo */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-brand-400 text-sm font-medium uppercase tracking-wide mb-3">Structured test blocks</p>
              <h2 className="text-3xl font-bold text-white mb-4">Write tests in your PR description</h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Drop a YAML block between <code className="text-brand-300">{'<!-- previewqa:start -->'}</code> tags in your PR body.
                PreviewQA parses it, validates it, and runs it — no separate test file needed.
              </p>
              <ul className="space-y-3 text-sm text-gray-300">
                {[
                  'Versioned schema with clear validation errors',
                  'All Playwright step types: navigate, fill, click, assert, screenshot',
                  'Login profiles via Key Vault — no secrets in PR body',
                  'AI suggests missing coverage based on changed files',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-800 rounded-xl p-5 font-mono text-sm">
              <div className="text-gray-400 text-xs mb-3">PR description snippet</div>
              <pre className="text-gray-300 leading-relaxed whitespace-pre-wrap">{`<!-- previewqa:start -->
version: 1
login: admin-user

steps:
  - navigate: /dashboard
  - assert_visible:
      selector: '[data-testid="welcome"]'
  - click:
      selector: '[data-testid="new-project"]'
  - fill:
      selector: '[data-testid="project-name"]'
      value: "My Test Project"
  - click:
      selector: '[data-testid="create-btn"]'
  - assert_visible:
      selector: '[data-testid="project-card"]'
  - screenshot: after-create
<!-- previewqa:end -->`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* AI Code Review section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-brand-600 text-sm font-medium uppercase tracking-wide mb-3">AI Code Review</p>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">7 specialist agents, one PR comment</h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Every PR gets a parallel review by seven LLM agents — each a specialist. Findings are grounded in your
              project's history so repeat noise is suppressed. Results land as inline GitHub annotations and a sticky summary.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Security', color: 'bg-red-50 text-red-700 border-red-100', desc: 'OWASP + CVE lookup' },
                { label: 'Logic', color: 'bg-orange-50 text-orange-700 border-orange-100', desc: 'Race conditions, off-by-ones' },
                { label: 'Type Safety', color: 'bg-amber-50 text-amber-700 border-amber-100', desc: 'any, !, untyped JSON' },
                { label: 'Performance', color: 'bg-yellow-50 text-yellow-700 border-yellow-100', desc: 'N+1, missing LIMIT' },
                { label: 'Test Coverage', color: 'bg-green-50 text-green-700 border-green-100', desc: 'Missing error cases' },
                { label: 'Architecture', color: 'bg-blue-50 text-blue-700 border-blue-100', desc: 'Layer violations, deps' },
                { label: 'Docs', color: 'bg-purple-50 text-purple-700 border-purple-100', desc: 'Missing JSDoc, stale docs' },
              ].map((agent) => (
                <div key={agent.label} className={`border rounded-lg px-3 py-2 ${agent.color}`}>
                  <p className="text-xs font-semibold">{agent.label}</p>
                  <p className="text-xs opacity-75">{agent.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <Code2 className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-300 font-medium">AI Review — PR #47</span>
              <span className="ml-auto text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">Block</span>
            </div>
            <div className="p-5 font-mono text-xs space-y-3">
              <div className="border border-red-800/50 bg-red-900/20 rounded-lg p-3">
                <p className="text-red-400 font-semibold mb-1">🔒 Security · Error</p>
                <p className="text-gray-300">SQL injection via unsanitized req.query.id in /api/users</p>
                <p className="text-gray-500 mt-1">src/routes/users.ts:42</p>
              </div>
              <div className="border border-orange-800/50 bg-orange-900/20 rounded-lg p-3">
                <p className="text-orange-400 font-semibold mb-1">🔄 Logic · Warning</p>
                <p className="text-gray-300">Missing await on sendEmail() — fire-and-forget can mask errors</p>
                <p className="text-gray-500 mt-1">src/services/auth.ts:89</p>
              </div>
              <div className="border border-green-800/50 bg-green-900/20 rounded-lg p-3">
                <p className="text-green-400 font-semibold mb-1">✅ Architecture · Info</p>
                <p className="text-gray-300">5 agents passed with no findings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Teams shipping faster with confidence</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <p className="text-gray-700 leading-relaxed mb-6 text-sm">"{t.quote}"</p>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role} · {t.company}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">Frequently asked questions</h2>
        <FaqList />
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-700 to-brand-900 py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Start testing your previews today</h2>
          <p className="text-brand-200 mb-8 text-lg">
            Free tier · 50 runs/month · No credit card · No YAML required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-brand-700 border-0 hover:bg-brand-50 font-semibold" asChild>
              <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
                Install on GitHub — free
              </a>
            </Button>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 text-base font-medium rounded-lg text-white border border-white/20 hover:bg-white/10 active:bg-white/20 transition-colors"
            >
              See all plans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
