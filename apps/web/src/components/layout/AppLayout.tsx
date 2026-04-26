import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppNav.js';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AppSidebar />
      <main className="flex-1 min-w-0 p-8">
        <Outlet />
      </main>
    </div>
  );
}
