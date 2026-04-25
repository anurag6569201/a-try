import type { PlanSuggesterInput, PlanSuggesterOutput } from '../types.js';

export interface PlanSuggesterFixture {
  id: string;
  input: PlanSuggesterInput;
  expect: {
    suggestionCount: number | { min: number; max: number };
    firstRouteContains?: string;
    allRoutesPresent?: string[];
    empty?: boolean;
  };
  mockOutput: PlanSuggesterOutput;
}

export const planSuggesterFixtures: PlanSuggesterFixture[] = [
  {
    id: 'PS-01',
    input: {
      changedFiles: ['app/dashboard/page.tsx'],
      existingSteps: [{ type: 'navigate', url: 'https://preview.example.com' }],
      previewUrl: 'https://preview.example.com',
    },
    expect: { suggestionCount: 1, firstRouteContains: 'dashboard' },
    mockOutput: { suggestions: [{ route: '/dashboard', reason: 'Dashboard page was modified', stepType: 'navigate' }] },
  },
  {
    id: 'PS-02',
    input: {
      changedFiles: ['app/about/page.tsx'],
      existingSteps: [{ type: 'navigate', url: 'https://preview.example.com/about' }],
      previewUrl: 'https://preview.example.com',
    },
    expect: { empty: true, suggestionCount: 0 },
    mockOutput: { suggestions: [] },
  },
  {
    id: 'PS-03',
    input: {
      changedFiles: ['pages/api/users.ts'],
      existingSteps: [{ type: 'navigate', url: 'https://preview.example.com' }],
      previewUrl: 'https://preview.example.com',
    },
    expect: { suggestionCount: 1, firstRouteContains: 'users' },
    mockOutput: { suggestions: [{ route: '/api/users', reason: 'API route modified — verify response', stepType: 'navigate' }] },
  },
  {
    id: 'PS-04',
    input: {
      changedFiles: ['app/profile/page.tsx', 'app/profile/settings/page.tsx'],
      existingSteps: [],
      previewUrl: 'https://preview.example.com',
    },
    expect: { suggestionCount: { min: 1, max: 5 }, allRoutesPresent: ['/profile'] },
    mockOutput: {
      suggestions: [
        { route: '/profile', reason: 'Profile page modified', stepType: 'navigate' },
        { route: '/profile/settings', reason: 'Profile settings page modified', stepType: 'navigate' },
      ],
    },
  },
  {
    id: 'PS-05',
    input: {
      changedFiles: ['components/Button.tsx', 'components/Modal.tsx'],
      existingSteps: [{ type: 'navigate', url: 'https://preview.example.com' }, { type: 'assert_visible', selector: '.hero' }],
      previewUrl: 'https://preview.example.com',
    },
    expect: { suggestionCount: { min: 0, max: 5 } },
    mockOutput: { suggestions: [] },
  },
];
