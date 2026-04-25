import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  const mockGetInstallationOctokit = vi.fn().mockResolvedValue({});
  const mockListOpenPRs = vi.fn().mockResolvedValue([]);
  const mockUpsertStickyComment = vi.fn().mockResolvedValue(1);
  const mockPostComment = vi.fn().mockResolvedValue(1);
  const mockRunOnboardingChecklist = vi.fn().mockResolvedValue({
    hasPRTemplate: false,
    hasPreviewQAConfig: false,
    hasDataTestIds: false,
    hasLoginProfile: false,
    prTemplateBody: null,
  });
  const mockFormatOnboardingComment = vi.fn().mockReturnValue('## Onboarding Checklist\n...');
  return {
    mockGetInstallationOctokit,
    mockListOpenPRs,
    mockUpsertStickyComment,
    mockPostComment,
    mockRunOnboardingChecklist,
    mockFormatOnboardingComment,
  };
});

vi.mock('@preview-qa/github-adapter', () => ({
  getInstallationOctokit: mocks.mockGetInstallationOctokit,
  listOpenPRs: mocks.mockListOpenPRs,
  upsertStickyComment: mocks.mockUpsertStickyComment,
  postComment: mocks.mockPostComment,
}));

vi.mock('@preview-qa/onboarding', () => ({
  runOnboardingChecklist: mocks.mockRunOnboardingChecklist,
  formatOnboardingComment: mocks.mockFormatOnboardingComment,
}));

import { handleInstallationCreatedEvent } from '../handlers/installation.js';

const fakePool = {} as Parameters<typeof handleInstallationCreatedEvent>[0];
const fakeConfig = {
  serviceBusConnectionString: '',
  queueName: '',
  dbConnectionString: '',
  github: { appId: 1, privateKey: 'pk' },
  vercel: { apiToken: 'v' },
  storage: { connectionString: '', containerName: 'a' },
};

function makeEnvelope(repos: Array<{ id: number; name: string; fullName: string; private: boolean }> = []) {
  return {
    messageId: '00000000-0000-0000-0000-000000000001',
    eventType: 'installation.created' as never,
    installationId: '999',
    repositoryId: '999',
    correlationId: '00000000-0000-0000-0000-000000000002',
    occurredAt: new Date().toISOString(),
    payload: {
      installationGithubId: 999,
      accountLogin: 'acme',
      accountType: 'Organization',
      repositories: repos,
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('handleInstallationCreatedEvent', () => {
  it('runs onboarding checklist for each repository', async () => {
    const repos = [
      { id: 1, name: 'myapp', fullName: 'acme/myapp', private: false },
      { id: 2, name: 'api', fullName: 'acme/api', private: false },
    ];
    await handleInstallationCreatedEvent(fakePool, fakeConfig, makeEnvelope(repos));
    expect(mocks.mockRunOnboardingChecklist).toHaveBeenCalledTimes(2);
  });

  it('posts onboarding comment on most recent open non-draft PR', async () => {
    mocks.mockListOpenPRs.mockResolvedValue([
      { id: 10, number: 42, title: 'feat: new feature', headSha: 'abc', isFork: false, isDraft: false, state: 'open', headBranch: 'feat', baseBranch: 'main', authorLogin: 'dev', body: null },
    ]);
    const repos = [{ id: 1, name: 'myapp', fullName: 'acme/myapp', private: false }];
    await handleInstallationCreatedEvent(fakePool, fakeConfig, makeEnvelope(repos));
    expect(mocks.mockUpsertStickyComment).toHaveBeenCalledOnce();
    const call = mocks.mockUpsertStickyComment.mock.calls[0] as unknown[];
    const input = call[1] as { pullNumber?: number };
    expect(input?.pullNumber).toBe(42);
  });

  it('skips draft PRs', async () => {
    mocks.mockListOpenPRs.mockResolvedValue([
      { id: 10, number: 5, title: 'WIP', headSha: 'abc', isFork: false, isDraft: true, state: 'open', headBranch: 'feat', baseBranch: 'main', authorLogin: 'dev', body: null },
    ]);
    const repos = [{ id: 1, name: 'myapp', fullName: 'acme/myapp', private: false }];
    await handleInstallationCreatedEvent(fakePool, fakeConfig, makeEnvelope(repos));
    expect(mocks.mockUpsertStickyComment).not.toHaveBeenCalled();
  });

  it('skips fork PRs', async () => {
    mocks.mockListOpenPRs.mockResolvedValue([
      { id: 10, number: 6, title: 'Fork PR', headSha: 'abc', isFork: true, isDraft: false, state: 'open', headBranch: 'feat', baseBranch: 'main', authorLogin: 'ext', body: null },
    ]);
    const repos = [{ id: 1, name: 'myapp', fullName: 'acme/myapp', private: false }];
    await handleInstallationCreatedEvent(fakePool, fakeConfig, makeEnvelope(repos));
    expect(mocks.mockUpsertStickyComment).not.toHaveBeenCalled();
  });

  it('does not throw when no repositories in payload', async () => {
    await expect(
      handleInstallationCreatedEvent(fakePool, fakeConfig, makeEnvelope([])),
    ).resolves.toBeUndefined();
  });

  it('continues processing other repos when one fails', async () => {
    mocks.mockRunOnboardingChecklist
      .mockRejectedValueOnce(new Error('repo 1 failed'))
      .mockResolvedValue({ hasPRTemplate: false, hasPreviewQAConfig: false, hasDataTestIds: false, hasLoginProfile: false, prTemplateBody: null });
    const repos = [
      { id: 1, name: 'broken', fullName: 'acme/broken', private: false },
      { id: 2, name: 'good', fullName: 'acme/good', private: false },
    ];
    await handleInstallationCreatedEvent(fakePool, fakeConfig, makeEnvelope(repos));
    expect(mocks.mockRunOnboardingChecklist).toHaveBeenCalledTimes(2);
  });
});
