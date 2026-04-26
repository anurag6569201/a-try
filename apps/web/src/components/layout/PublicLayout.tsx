import { Outlet } from 'react-router-dom';
import { PublicNav } from './PublicNav.js';

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />
      <Outlet />
      <footer className="border-t border-gray-200 bg-gray-50 py-12 mt-24">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8 text-sm text-gray-500">
          <div className="space-y-2">
            <div className="font-bold text-gray-900 flex items-center gap-2 text-base">
              <span>⚡</span> PreviewQA
            </div>
            <p className="max-w-xs">Automated Playwright QA on every Vercel preview deploy — wired to GitHub.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <p className="font-medium text-gray-900">Product</p>
              <nav className="flex flex-col gap-2">
                <a href="/pricing" className="hover:text-gray-900">Pricing</a>
                <a href="/docs" className="hover:text-gray-900">Docs</a>
                <a href="/docs/changelog" className="hover:text-gray-900">Changelog</a>
              </nav>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-gray-900">Resources</p>
              <nav className="flex flex-col gap-2">
                <a href="/docs/quickstart" className="hover:text-gray-900">Quickstart</a>
                <a href="/docs/config" className="hover:text-gray-900">Config reference</a>
                <a href="/docs/commands" className="hover:text-gray-900">PR commands</a>
              </nav>
            </div>
            <div className="space-y-3">
              <p className="font-medium text-gray-900">Legal</p>
              <nav className="flex flex-col gap-2">
                <a href="#" className="hover:text-gray-900">Privacy</a>
                <a href="#" className="hover:text-gray-900">Terms</a>
              </nav>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-8 pt-8 border-t border-gray-200 text-xs text-gray-400">
          © {new Date().getFullYear()} PreviewQA. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
