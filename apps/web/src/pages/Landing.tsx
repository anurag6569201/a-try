import { Link } from 'react-router-dom';
import { CheckCircle2, Zap, GitPullRequest, ShieldCheck, BarChart2, Clock, ArrowRight, Bot, Code2 } from 'lucide-react';
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

export function Landing() {
  return (
    <div className="text-gray-700">
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-3 py-1 rounded-full mb-6 border border-brand-200">
          <Zap className="w-3.5 h-3.5" /> AI-powered · 7-agent code review · Zero config · Live now
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
          Catch bugs before<br />
          <span className="text-brand-600">they reach production</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          PreviewQA automatically runs Playwright tests on every Vercel preview deployment.
          Get a GitHub Check, PR comment, and AI failure analysis — in minutes, not hours.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" asChild>
            <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
              Install on GitHub — it's free
            </a>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link to="/app/dashboard">
              Go to dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-4">Free tier — 50 runs/month · No credit card · No config required</p>

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
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How it works</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="text-center">
              <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                {step.step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
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

      {/* CTA */}
      <section className="bg-brand-600 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Start testing your previews today</h2>
          <p className="text-brand-100 mb-8 text-lg">
            Free tier gets you 50 runs/month. No credit card. No YAML required to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="bg-white text-brand-700 border-0 hover:bg-brand-50" asChild>
              <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
                Install on GitHub — free
              </a>
            </Button>
            <Button size="lg" variant="ghost" className="text-white hover:bg-brand-700" asChild>
              <Link to="/pricing">See all plans <ArrowRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
