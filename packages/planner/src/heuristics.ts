import { StepType } from '@preview-qa/domain';
import type { ParsedStep } from '@preview-qa/parser';

/**
 * Patterns that map a changed file path to a Next.js URL route.
 *
 * Evaluated in order; first match wins for each file.
 *
 * Supported conventions:
 *   app/      - Next.js App Router  (app/dashboard/page.tsx → /dashboard)
 *   pages/    - Next.js Pages Router (pages/dashboard.tsx → /dashboard)
 *   components/ - not a route; skip
 *   api/      - API route (pages/api/users.ts → /api/users)
 */

const STRIP_EXTENSIONS = /\.(tsx?|jsx?|mdx?)$/;

// Segments that don't contribute to the URL
const IGNORED_SEGMENTS = new Set(['page', 'layout', 'loading', 'error', 'not-found', 'template', 'route', 'index']);

// Dynamic segments like [id] or [...slug] → replaced with a placeholder
const DYNAMIC_SEGMENT = /^\[\.{0,3}(.+)\]$/;

function segmentToUrlPart(segment: string): string | null {
  if (IGNORED_SEGMENTS.has(segment)) return null;
  const dynMatch = DYNAMIC_SEGMENT.exec(segment);
  if (dynMatch) return null; // skip dynamic segments — can't resolve at plan time
  return segment;
}

function fileToRoute(filePath: string): string | null {
  const normalized = filePath.replace(STRIP_EXTENSIONS, '');

  // Next.js App Router: app/**/page | layout | route
  const appMatch = /^(?:src\/)?app\/(.+)$/.exec(normalized);
  if (appMatch) {
    const parts = appMatch[1]!.split('/').map(segmentToUrlPart).filter((p): p is string => p !== null);
    return '/' + parts.join('/') || '/';
  }

  // Next.js Pages Router: pages/**
  const pagesMatch = /^(?:src\/)?pages\/(.+)$/.exec(normalized);
  if (pagesMatch) {
    const inner = pagesMatch[1]!;
    if (inner === 'index' || inner === '_app' || inner === '_document' || inner === '_error') return null;
    const parts = inner.split('/').map(segmentToUrlPart).filter((p): p is string => p !== null);
    return '/' + parts.join('/') || '/';
  }

  return null;
}

export function mapChangedFilesToRoutes(changedFiles: string[]): string[] {
  const routes = new Set<string>();
  for (const file of changedFiles) {
    const route = fileToRoute(file);
    if (route !== null) routes.add(route);
  }
  return Array.from(routes);
}

export function buildHeuristicSteps(routes: string[], previewUrl: string): ParsedStep[] {
  const base = previewUrl.replace(/\/$/, '');
  const steps: ParsedStep[] = [];
  for (const route of routes) {
    const url = base + route;
    steps.push(
      { type: StepType.Navigate, url } as unknown as ParsedStep,
      { type: StepType.Assert200, url } as unknown as ParsedStep,
      { type: StepType.Screenshot, label: `heuristic${route.replace(/\//g, '-')}` } as unknown as ParsedStep,
    );
  }
  return steps;
}
