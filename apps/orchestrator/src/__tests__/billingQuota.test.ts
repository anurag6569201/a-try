import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunMode, RunState } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockCreateRun = vi.fn();
  const mockCancelSupersededRuns = vi.fn().mockResolvedValue(0);
  const mockCreateAuditEvent = vi.fn().mockResolvedValue({ id: 'audit-1' });
  const mockCountActiveRunsForInstallation = vi.fn().mockResolvedValue(0);
  const mockGetInstallationById = vi.fn().mockResolvedValue({ tier: 'free' });
  const mockCountRunsForInstallationSince = vi.fn().mockResolvedValue(0);
  const mockCreateInitialCheck = vi.fn().mockResolvedValue(42);
  const mockReportStateChange = vi.fn().mockResolvedValue(undefined);
  const mockReportStateChangeWithBody = vi.fn().mockResolvedValue(undefined);
  const mockTransition = vi.fn().mockResolvedValue({ success: true });
  const mockPollForPreview = vi.fn().mockResolvedValue({ status: 'resolved', url: 'https://preview.example.com' });
  const mockParsePRBody = vi.fn().mockReturnValue({ outcome: 'parse.not_found' });
  const mockExtractYamlBlock = vi.fn().mockReturnValue({ found: false });
  const mockBuildPlan = vi.fn().mockResolvedValue({ planId: 'plan-1', testCases: [{ name: 'Smoke', steps: [], order: 0 }] });
  const mockExecuteRun = vi.fn().mockResolvedValue({ outcome: 'pass', steps: [], durationMs: 100 });
  const mockUpsertStickyComment = vi.fn().mockResolvedValue(1);
  const mockGetInstallationOctokit = vi.fn().mockResolvedValue({});
  return {
    mockCreateRun, mockCancelSupersededRuns, mockCreateAuditEvent,
    mockCountActiveRunsForInstallation, mockGetInstallationById, mockCountRunsForInstallationSince,
    mockCreateInitialCheck, mockReportStateChange, mockReportStateChangeWithBody,
    mockTransition, mockPollForPreview, mockParsePRBody, mockExtractYamlBlock,
    mockBuildPlan, mockExecuteRun, mockUpsertStickyComment, mockGetInstallationOctokit,
  };
});

vi.mock('@preview-qa/db', () => ({
  createRun: mocks.mockCreateRun,
  cancelSupersededRuns: mocks.mockCancelSupersededRuns,
  createAuditEvent: mocks.mockCreateAuditEvent,
  countActiveRunsForInstallation: mocks.mockCountActiveRunsForInstallation,
  getInstallationById: mocks.mockGetInstallationById,
  countRunsForInstallationSince: mocks.mockCountRunsForInstallationSince,
}));

vi.mock('../github-reporter.js', () => ({
  createInitialCheck: mocks.mockCreateInitialCheck,
  reportStateChange: mocks.mockReportStateChange,
  reportStateChangeWithBody: mocks.mockReportStateChangeWithBody,
}));

vi.mock('../statemachine.js', () => ({
  transition: mocks.mockTransition,
}));

vi.mock('../preview-poller.js', () => ({
  pollForPreview: mocks.mockPollForPreview,
}));

vi.mock('@preview-qa/parser', () => ({
  parsePRBody: mocks.mockParsePRBody,
  formatParseErrors: vi.fn().mockReturnValue(''),
  extractYamlBlock: mocks.mockExtractYamlBlock,
}));

vi.mock('@preview-qa/planner', () => ({
  buildPlan: mocks.mockBuildPlan,
}));

vi.mock('@preview-qa/runner-playwright', () => ({
  executeRun: mocks.mockExecuteRun,
}));

vi.mock('@preview-qa/github-adapter', () => ({
  upsertStickyComment: mocks.mockUpsertStickyComment,
  getInstallationOctokit: mocks.mockGetInstallationOctokit,
  getPRChangedFiles: vi.fn().mockResolvedValue([]),
}));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({ uploadFile: vi.fn(), url: 'https://blob.test/file' }),
      }),
    }),
  },
}));

vi.mock('../loginProfile.js', () => ({
  resolveStorageState: vi.fn(),
}));

import { handlePullRequestEvent } from '../handlers/pullRequest.js';

const fakePool = {} as Parameters<typeof handlePullRequestEvent>[0];
const fakeConfig = {
  serviceBusConnectionString: '',
  queueName: '',
  dbConnectionString: '',
  github: { appId: 1, privateKey: 'pk' },
  vercel: { apiToken: 'v' },
  storage: { connectionString: '', containerName: 'a' },
};

function makeEnvelope() {
  return {
    messageId: '00000000-0000-0000-0000-000000000001',
    eventType: 'pull_request.opened' as never,
    installationId: '111',
    repositoryId: 'repo-1',
    correlationId: '00000000-0000-0000-0000-000000000002',
    occurredAt: new Date().toISOString(),
    payload: {
      pullRequestId: 'pr-1',
      githubNumber: 5,
      sha: 'aaaa'.repeat(10),
      headBranch: 'feat/x',
      baseBranch: 'main',
      authorLogin: 'dev',
      isFork: false,
      title: 'test PR',
      body: null,
      owner: 'acme',
      repo: 'myapp',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockCreateRun.mockResolvedValue({
    id: 'run-1', state: RunState.Queued, pull_request_id: 'pr-1',
    repository_id: 'repo-1', installation_id: '111', sha: 'aaaa'.repeat(10),
    mode: RunMode.Smoke, triggered_by: 'push', github_check_id: null,
    preview_url: null, started_at: null, completed_at: null,
    created_at: new Date(), updated_at: new Date(),
  });
  mocks.mockTransition.mockResolvedValue({ success: true });
  mocks.mockPollForPreview.mockResolvedValue({ status: 'resolved', url: 'https://p.example.com' });
  mocks.mockParsePRBody.mockReturnValue({ outcome: 'parse.not_found' });
  mocks.mockExtractYamlBlock.mockReturnValue({ found: false });
  mocks.mockBuildPlan.mockResolvedValue({ planId: 'plan-1', testCases: [{ name: 'Smoke', steps: [], order: 0 }] });
  mocks.mockExecuteRun.mockResolvedValue({ outcome: 'pass', steps: [], durationMs: 100 });
  mocks.mockGetInstallationById.mockResolvedValue({ tier: 'free' });
  mocks.mockCountRunsForInstallationSince.mockResolvedValue(0);
  mocks.mockCountActiveRunsForInstallation.mockResolvedValue(0);
});

describe('Billing quota enforcement', () => {
  it('proceeds normally when monthly run count is below the free tier limit', async () => {
    mocks.mockCountRunsForInstallationSince.mockResolvedValue(10);
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope());
    expect(mocks.mockCreateRun).toHaveBeenCalledOnce();
  });

  it('blocks run and posts upgrade CTA when free tier quota is exceeded', async () => {
    mocks.mockCountRunsForInstallationSince.mockResolvedValue(50); // free limit = 50
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope());
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
    expect(mocks.mockUpsertStickyComment).toHaveBeenCalledOnce();
    const body = (mocks.mockUpsertStickyComment.mock.calls[0] as unknown[])[1] as { body?: string };
    expect(body?.body).toContain('Quota');
    expect(body?.body).toContain('free');
    expect(body?.body).toContain('50');
  });

  it('allows run when exactly one below the free tier limit', async () => {
    mocks.mockCountRunsForInstallationSince.mockResolvedValue(49);
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope());
    expect(mocks.mockCreateRun).toHaveBeenCalledOnce();
  });

  it('uses starter tier limits when installation tier is starter', async () => {
    mocks.mockGetInstallationById.mockResolvedValue({ tier: 'starter' });
    mocks.mockCountRunsForInstallationSince.mockResolvedValue(499); // under starter limit of 500
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope());
    expect(mocks.mockCreateRun).toHaveBeenCalledOnce();
  });

  it('blocks run and posts upgrade CTA when starter tier quota is exceeded', async () => {
    mocks.mockGetInstallationById.mockResolvedValue({ tier: 'starter' });
    mocks.mockCountRunsForInstallationSince.mockResolvedValue(500); // starter limit = 500
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope());
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
    expect(mocks.mockUpsertStickyComment).toHaveBeenCalledOnce();
    const body = (mocks.mockUpsertStickyComment.mock.calls[0] as unknown[])[1] as { body?: string };
    expect(body?.body).toContain('starter');
    expect(body?.body).toContain('500');
  });

  it('falls back to free tier limits when installation is not found', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(null);
    mocks.mockCountRunsForInstallationSince.mockResolvedValue(50);
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope());
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
  });
});
