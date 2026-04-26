import { Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppSidebar } from './AppNav.js';
import { PageSpinner } from '../ui/Spinner.js';
import { BASE, getToken, clearToken } from '../../lib/api.js';

interface Me { login: string; avatarUrl: string; installationIds: string[] }

async function fetchMe(): Promise<Me | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { clearToken(); return null; }
  return res.json() as Promise<Me | null>;
}

export function AppLayout() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  if (isLoading) return <PageSpinner />;
  if (!me) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-50/60">
      <AppSidebar me={me} />
      <main className="flex-1 min-w-0 p-6 lg:p-8 max-w-5xl">
        <Outlet />
      </main>
    </div>
  );
}
