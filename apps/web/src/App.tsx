import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { PublicLayout } from './components/layout/PublicLayout.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { DocsLayout } from './pages/docs/DocsLayout.js';

import { Login } from './pages/Login.js';
import { Landing } from './pages/Landing.js';
import { Pricing } from './pages/Pricing.js';

import { Quickstart } from './pages/docs/Quickstart.js';
import { HowItWorks } from './pages/docs/HowItWorks.js';
import { GithubAppSetup } from './pages/docs/GithubAppSetup.js';
import { ConfigReference } from './pages/docs/ConfigReference.js';
import { TestBlocks } from './pages/docs/TestBlocks.js';
import { LoginProfiles } from './pages/docs/LoginProfiles.js';
import { Commands } from './pages/docs/Commands.js';
import { Modes } from './pages/docs/Modes.js';
import { AiFeatures } from './pages/docs/AiFeatures.js';
import { ForkPolicy } from './pages/docs/ForkPolicy.js';
import { Changelog } from './pages/docs/Changelog.js';

import { Dashboard } from './pages/app/Dashboard.js';
import { InstallationDetail } from './pages/app/InstallationDetail.js';
import { RepoDetail } from './pages/app/RepoDetail.js';
import { RunDetail } from './pages/app/RunDetail.js';
import { RepoConfig } from './pages/app/RepoConfig.js';
import { Settings } from './pages/app/Settings.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Public / marketing */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />

            {/* Docs */}
            <Route path="/docs" element={<DocsLayout />}>
              <Route index element={<Navigate to="/docs/quickstart" replace />} />
              <Route path="quickstart"     element={<Quickstart />} />
              <Route path="how-it-works"   element={<HowItWorks />} />
              <Route path="github-app"     element={<GithubAppSetup />} />
              <Route path="config"         element={<ConfigReference />} />
              <Route path="test-blocks"    element={<TestBlocks />} />
              <Route path="login-profiles" element={<LoginProfiles />} />
              <Route path="commands"       element={<Commands />} />
              <Route path="modes"          element={<Modes />} />
              <Route path="ai"             element={<AiFeatures />} />
              <Route path="fork-policy"    element={<ForkPolicy />} />
              <Route path="changelog"      element={<Changelog />} />
            </Route>
          </Route>

          {/* App / dashboard */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="installations/:installationId">
              <Route index element={<InstallationDetail />} />
              <Route path="settings" element={<Settings />} />
              <Route path="repos/:repoId">
                <Route index element={<RepoDetail />} />
                <Route path="config" element={<RepoConfig />} />
                <Route path="runs/:runId" element={<RunDetail />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
