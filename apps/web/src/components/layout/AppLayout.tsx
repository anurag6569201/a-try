import { Outlet, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppSidebar } from './AppNav.js';
import { PageSpinner } from '../ui/Spinner.js';

interface Me { login: string; avatarUrl: string; installationIds: string[] }

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3001';

async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
  if (!res.ok) return null;
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
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar me={me} />
      <main className="flex-1 min-w-0 p-8">
        <Outlet />
      </main>
    </div>
  );
}
