import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';

const NAV = [
  { section: 'Getting Started', items: [
    { to: '/docs/quickstart', label: 'Quickstart' },
    { to: '/docs/how-it-works', label: 'How it works' },
    { to: '/docs/github-app', label: 'GitHub App setup' },
  ]},
  { section: 'Configuration', items: [
    { to: '/docs/config', label: 'Config reference' },
    { to: '/docs/test-blocks', label: 'Test blocks (YAML)' },
    { to: '/docs/login-profiles', label: 'Login profiles' },
  ]},
  { section: 'Features', items: [
    { to: '/docs/commands', label: 'PR commands' },
    { to: '/docs/modes', label: 'Run modes' },
    { to: '/docs/ai', label: 'AI features' },
    { to: '/docs/fork-policy', label: 'Fork policy' },
  ]},
  { section: 'Reference', items: [
    { to: '/docs/changelog', label: 'Changelog' },
  ]},
];

export function DocsLayout() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 flex gap-10">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 hidden md:block">
        <div className="sticky top-24 space-y-6">
          {NAV.map((section) => (
            <div key={section.section}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
                {section.section}
              </p>
              <nav className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        'block px-3 py-1.5 text-sm rounded-lg transition-colors',
                        isActive
                          ? 'bg-brand-50 text-brand-700 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Content */}
      <article className="flex-1 min-w-0 prose-doc">
        <Outlet />
      </article>
    </div>
  );
}
