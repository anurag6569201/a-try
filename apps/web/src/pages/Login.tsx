import { Github } from 'lucide-react';
import { authUrl } from '../lib/api.js';
import { Button } from '../components/ui/Button.js';

export function Login() {
  const error = new URLSearchParams(window.location.search).get('error');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">PreviewQA</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to manage your installations</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            Authentication failed. Please try again.
          </div>
        )}

        <Button asChild className="w-full justify-center gap-3">
          <a href={authUrl}>
            <Github className="w-5 h-5" />
            Continue with GitHub
          </a>
        </Button>

        <p className="mt-6 text-center text-xs text-gray-400">
          By signing in you agree to our{' '}
          <a href="/docs/fork-policy" className="underline">terms</a>.
        </p>
      </div>
    </div>
  );
}
