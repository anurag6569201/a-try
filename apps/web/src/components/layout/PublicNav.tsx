import { Link, NavLink } from 'react-router-dom';
import { Button } from '../ui/Button.js';

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
          <span className="text-2xl">⚡</span>
          <span>PreviewQA</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
          <NavLink to="/pricing" className={({ isActive }) => isActive ? 'text-brand-600 font-medium' : 'hover:text-gray-900'}>
            Pricing
          </NavLink>
          <NavLink to="/docs" className={({ isActive }) => isActive ? 'text-brand-600 font-medium' : 'hover:text-gray-900'}>
            Docs
          </NavLink>
          <NavLink to="/docs/changelog" className={({ isActive }) => isActive ? 'text-brand-600 font-medium' : 'hover:text-gray-900'}>
            Changelog
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/app/dashboard" className="text-sm text-gray-600 hover:text-gray-900 hidden sm:block">
            Sign in
          </Link>
          <Button size="sm" asChild>
            <a href="https://github.com/apps/preview-qa" target="_blank" rel="noopener noreferrer">
              Install on GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
