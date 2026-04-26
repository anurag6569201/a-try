import { Link, NavLink } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '../ui/Button.js';

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg tracking-tight">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span>PreviewQA</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {[
            { to: '/pricing', label: 'Pricing' },
            { to: '/docs', label: 'Docs' },
            { to: '/docs/changelog', label: 'Changelog' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                isActive
                  ? 'px-3 py-1.5 rounded-md text-brand-700 bg-brand-50 font-medium'
                  : 'px-3 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors'
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/app/dashboard"
            className="text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors hidden sm:block"
          >
            Sign in
          </Link>
          <Button size="sm" asChild>
            <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
              Install free
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
