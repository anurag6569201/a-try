import { Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, GitPullRequest, Settings, ChevronRight,
  Zap, BookOpen, LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItemProps { to: string; icon: React.ReactNode; label: string; end?: boolean }

function NavItem({ to, icon, label, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150',
          isActive
            ? 'bg-brand-600 text-white font-medium shadow-sm'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        )
      }
    >
      <span className="w-4 h-4 shrink-0">{icon}</span>
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
    <aside className="w-56 shrink-0 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      <div className="px-4 py-4 border-b border-gray-100">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-gray-900 tracking-tight">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span>PreviewQA</span>
        </Link>
      </div>

      <nav className="flex-1 p-2.5 space-y-0.5">
        <NavItem end to="/app/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard" />
        {installationId && (
          <>
            <div className="pt-4 pb-1.5 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Workspace
            </div>
            <NavItem to={base} icon={<GitPullRequest className="w-4 h-4" />} label="Repositories" />
            <NavItem to={`${base}/settings`} icon={<Settings className="w-4 h-4" />} label="Settings" />
          </>
        )}
      </nav>

      <div className="p-2.5 border-t border-gray-100 space-y-0.5">
        <a
          href="/docs"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          Documentation
        </a>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
          <img src={me.avatarUrl} alt={me.login} className="w-6 h-6 rounded-full ring-1 ring-gray-200" />
          <span className="text-sm text-gray-700 flex-1 truncate font-medium">{me.login}</span>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface BreadcrumbProps { items: Array<{ label: string; to?: string }> }

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300" />}
          {item.to
            ? <Link to={item.to} className="hover:text-gray-700 transition-colors">{item.label}</Link>
            : <span className="text-gray-900 font-semibold">{item.label}</span>
          }
        </span>
      ))}
    </nav>
  );
}
