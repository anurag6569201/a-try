import { Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitPullRequest, Settings, ChevronRight,
  Zap, ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItemProps { to: string; icon: React.ReactNode; label: string; }

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      <span className="w-4 h-4">{icon}</span>
      {label}
    </NavLink>
  );
}

interface SidebarProps { me: { login: string; avatarUrl: string } }

export function AppSidebar({ me }: SidebarProps) {
  const { installationId } = useParams();
  const navigate = useNavigate();
  const base = installationId ? `/app/installations/${installationId}` : '/app';

  function handleSignOut() {
    localStorage.removeItem('pqa_session');
    navigate('/login', { replace: true });
  }

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2 font-bold text-gray-900">
          <Zap className="w-5 h-5 text-brand-600" />
          <span>PreviewQA</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <NavItem to="/app/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
        {installationId && (
          <>
            <div className="pt-3 pb-1 px-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
              Installation
            </div>
            <NavItem to={base} icon={<GitPullRequest className="w-4 h-4" />} label="Repositories" />
            <NavItem to={`${base}/settings`} icon={<Settings className="w-4 h-4" />} label="Settings" />
          </>
        )}
      </nav>

      <div className="p-3 border-t border-gray-100 space-y-1">
        <a
          href="/docs"
          target="_blank"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <ExternalLink className="w-4 h-4" />
          Documentation
        </a>
        <div className="flex items-center gap-3 px-3 py-2">
          <img src={me.avatarUrl} alt={me.login} className="w-6 h-6 rounded-full" />
          <span className="text-sm text-gray-700 flex-1 truncate">{me.login}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

interface BreadcrumbProps { items: Array<{ label: string; to?: string }> }

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
          {item.to
            ? <Link to={item.to} className="hover:text-gray-900">{item.label}</Link>
            : <span className="text-gray-900 font-medium">{item.label}</span>
          }
        </span>
      ))}
    </nav>
  );
}
