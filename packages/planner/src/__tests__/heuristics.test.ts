import { describe, it, expect } from 'vitest';
import { mapChangedFilesToRoutes, buildHeuristicSteps } from '../heuristics.js';
import { StepType } from '@preview-qa/domain';

describe('mapChangedFilesToRoutes', () => {
  describe('App Router (app/)', () => {
    it('maps app/dashboard/page.tsx to /dashboard', () => {
      expect(mapChangedFilesToRoutes(['app/dashboard/page.tsx'])).toEqual(['/dashboard']);
    });

    it('maps app/page.tsx to /', () => {
      expect(mapChangedFilesToRoutes(['app/page.tsx'])).toEqual(['/']);
    });

    it('maps nested route app/settings/profile/page.tsx to /settings/profile', () => {
      expect(mapChangedFilesToRoutes(['app/settings/profile/page.tsx'])).toEqual(['/settings/profile']);
    });

    it('maps src/app/about/page.tsx to /about', () => {
      expect(mapChangedFilesToRoutes(['src/app/about/page.tsx'])).toEqual(['/about']);
    });

    it('maps layout.tsx but strips layout segment', () => {
      // app/dashboard/layout.tsx → /dashboard (layout is ignored but parent route still included)
      expect(mapChangedFilesToRoutes(['app/dashboard/layout.tsx'])).toEqual(['/dashboard']);
    });

    it('skips dynamic segments like [id]', () => {
      // app/posts/[id]/page.tsx → /posts (dynamic segment dropped)
      expect(mapChangedFilesToRoutes(['app/posts/[id]/page.tsx'])).toEqual(['/posts']);
    });

    it('skips catch-all segments [...slug]', () => {
      expect(mapChangedFilesToRoutes(['app/blog/[...slug]/page.tsx'])).toEqual(['/blog']);
    });
  });

  describe('Pages Router (pages/)', () => {
    it('maps pages/dashboard.tsx to /dashboard', () => {
      expect(mapChangedFilesToRoutes(['pages/dashboard.tsx'])).toEqual(['/dashboard']);
    });

    it('maps pages/api/users.ts to /api/users', () => {
      expect(mapChangedFilesToRoutes(['pages/api/users.ts'])).toEqual(['/api/users']);
    });

    it('maps src/pages/about.tsx to /about', () => {
      expect(mapChangedFilesToRoutes(['src/pages/about.tsx'])).toEqual(['/about']);
    });

    it('ignores pages/_app.tsx', () => {
      expect(mapChangedFilesToRoutes(['pages/_app.tsx'])).toEqual([]);
    });

    it('ignores pages/_document.tsx', () => {
      expect(mapChangedFilesToRoutes(['pages/_document.tsx'])).toEqual([]);
    });

    it('ignores pages/index.tsx', () => {
      expect(mapChangedFilesToRoutes(['pages/index.tsx'])).toEqual([]);
    });
  });

  describe('Non-route files', () => {
    it('ignores components/', () => {
      expect(mapChangedFilesToRoutes(['components/Button.tsx'])).toEqual([]);
    });

    it('ignores lib/ files', () => {
      expect(mapChangedFilesToRoutes(['lib/utils.ts'])).toEqual([]);
    });

    it('ignores config files', () => {
      expect(mapChangedFilesToRoutes(['next.config.js', 'tailwind.config.ts'])).toEqual([]);
    });
  });

  describe('deduplication', () => {
    it('returns unique routes when multiple files map to the same route', () => {
      const files = ['app/dashboard/page.tsx', 'app/dashboard/layout.tsx'];
      expect(mapChangedFilesToRoutes(files)).toEqual(['/dashboard']);
    });
  });

  describe('mixed inputs', () => {
    it('handles a realistic PR diff', () => {
      const files = [
        'app/dashboard/page.tsx',
        'app/settings/profile/page.tsx',
        'components/Sidebar.tsx',
        'lib/auth.ts',
        'pages/api/health.ts',
      ];
      const routes = mapChangedFilesToRoutes(files);
      expect(routes).toContain('/dashboard');
      expect(routes).toContain('/settings/profile');
      expect(routes).toContain('/api/health');
      expect(routes).toHaveLength(3);
    });
  });
});

describe('buildHeuristicSteps', () => {
  it('returns empty array for empty routes', () => {
    expect(buildHeuristicSteps([], 'https://preview.example.com')).toEqual([]);
  });

  it('generates navigate + assert_200 + screenshot for each route', () => {
    const steps = buildHeuristicSteps(['/dashboard'], 'https://preview.example.com');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ type: StepType.Navigate, url: 'https://preview.example.com/dashboard' });
    expect(steps[1]).toMatchObject({ type: StepType.Assert200, url: 'https://preview.example.com/dashboard' });
    expect(steps[2]).toMatchObject({ type: StepType.Screenshot });
  });

  it('strips trailing slash from previewUrl', () => {
    const steps = buildHeuristicSteps(['/about'], 'https://preview.example.com/');
    expect(steps[0]).toMatchObject({ url: 'https://preview.example.com/about' });
  });

  it('generates steps for multiple routes', () => {
    const steps = buildHeuristicSteps(['/a', '/b'], 'https://p.example.com');
    expect(steps).toHaveLength(6);
    expect(steps[0]).toMatchObject({ url: 'https://p.example.com/a' });
    expect(steps[3]).toMatchObject({ url: 'https://p.example.com/b' });
  });
});
