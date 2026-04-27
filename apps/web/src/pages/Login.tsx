import { Github, Zap } from 'lucide-react';
import { authUrl } from '../lib/api.js';

export function Login() {
  const error = new URLSearchParams(window.location.search).get('error');

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-brand-600 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="font-semibold text-lg tracking-tight">PreviewQA</span>
        </div>

        <div>
          <blockquote className="text-2xl font-medium leading-snug text-white/90">
            "Ship with confidence — every PR reviewed, every preview tested, automatically."
          </blockquote>
          <div className="mt-8 flex flex-col gap-4">
            {[
              { stat: '< 2 min', label: 'average review time' },
              { stat: '100%', label: 'automated coverage' },
              { stat: '0 config', label: 'to get started' },
            ].map(({ stat, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white leading-none text-center">{stat}</span>
                </div>
                <span className="text-sm text-white/70">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">© {new Date().getFullYear()} PreviewQA. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" fill="currentColor" />
          </div>
          <span className="font-semibold text-lg tracking-tight text-gray-900">PreviewQA</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in to manage your installations and reviews.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
              <p className="text-sm text-red-700">Authentication failed. Please try again.</p>
            </div>
          )}

          <a
            href={authUrl}
            className="flex items-center justify-center gap-3 w-full rounded-xl bg-gray-900 hover:bg-gray-700 active:bg-gray-800 text-white text-sm font-medium px-5 py-3 transition-colors duration-150 shadow-sm"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </a>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {['Fast reviews', 'PR comments', 'Zero setup'].map((feat) => (
              <div key={feat} className="rounded-xl bg-gray-50 border border-gray-100 px-2 py-3">
                <p className="text-xs text-gray-500 leading-snug">{feat}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            By signing in you agree to our{' '}
            <a href="/docs/fork-policy" className="text-gray-600 hover:text-gray-900 underline underline-offset-2 transition-colors">
              terms of service
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
