import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockFileExistsInRepo = vi.fn();
  const mockGetFileContent = vi.fn();
  return { mockFileExistsInRepo, mockGetFileContent };
});

vi.mock('@preview-qa/github-adapter', () => ({
  fileExistsInRepo: mocks.mockFileExistsInRepo,
  getFileContent: mocks.mockGetFileContent,
}));

import { runOnboardingChecklist } from '../checklist.js';

const fakeOctokit = {} as Parameters<typeof runOnboardingChecklist>[0];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockGetFileContent.mockResolvedValue(null);
  mocks.mockFileExistsInRepo.mockResolvedValue(false);
});

describe('runOnboardingChecklist', () => {
  it('returns all false when no files exist', async () => {
    const result = await runOnboardingChecklist(fakeOctokit, 'acme', 'myapp');
    expect(result.hasPRTemplate).toBe(false);
    expect(result.hasPreviewQAConfig).toBe(false);
    expect(result.hasDataTestIds).toBe(false);
    expect(result.hasLoginProfile).toBe(false);
    expect(result.prTemplateBody).toBeNull();
  });

  it('detects PR template when file exists', async () => {
    mocks.mockGetFileContent.mockImplementation((_, __, ___, path: string) => {
      if (path === '.github/pull_request_template.md') return Promise.resolve('# PR Template\n## What changed');
      return Promise.resolve(null);
    });
    const result = await runOnboardingChecklist(fakeOctokit, 'acme', 'myapp');
    expect(result.hasPRTemplate).toBe(true);
    expect(result.prTemplateBody).toContain('PR Template');
  });

  it('detects data-testid in PR template', async () => {
    mocks.mockGetFileContent.mockResolvedValueOnce('Click the button with data-testid="submit"');
    const result = await runOnboardingChecklist(fakeOctokit, 'acme', 'myapp');
    expect(result.hasDataTestIds).toBe(true);
  });

  it('detects login profile in PR template', async () => {
    mocks.mockGetFileContent.mockResolvedValueOnce('login: admin-user\nsteps:\n  - navigate: /');
    const result = await runOnboardingChecklist(fakeOctokit, 'acme', 'myapp');
    expect(result.hasLoginProfile).toBe(true);
  });

  it('detects .previewqa/config.yaml when present', async () => {
    mocks.mockFileExistsInRepo.mockResolvedValue(true);
    const result = await runOnboardingChecklist(fakeOctokit, 'acme', 'myapp');
    expect(result.hasPreviewQAConfig).toBe(true);
  });

  it('checks multiple PR template paths in order', async () => {
    mocks.mockGetFileContent.mockImplementation((_, __, ___, path: string) => {
      if (path === 'pull_request_template.md') return Promise.resolve('fallback template');
      return Promise.resolve(null);
    });
    const result = await runOnboardingChecklist(fakeOctokit, 'acme', 'myapp');
    expect(result.hasPRTemplate).toBe(true);
    expect(result.prTemplateBody).toBe('fallback template');
  });
});
