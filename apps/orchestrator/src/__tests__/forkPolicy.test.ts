import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunMode, RunState } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockCreateRun = vi.fn();
  const mockCancelSupersededRuns = vi.fn().mockResolvedValue(0);
  const mockCreateAuditEvent = vi.fn().mockResolvedValue({ id: 'audit-1' });
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
    mockCreateInitialCheck, mockReportStateChange, mockReportStateChangeWithBody,
    mockTransition, mockPollForPreview, mockParsePRBody, mockExtractYamlBlock,
    mockBuildPlan, mockExecuteRun, mockUpsertStickyComment, mockGetInstallationOctokit,
  };
});

vi.mock('@preview-qa/db', () => ({
  createRun: mocks.mockCreateRun,
  cancelSupersededRuns: mocks.mockCancelSupersededRuns,
  createAuditEvent: mocks.mockCreateAuditEvent,
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
}));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: { fromConnectionString: vi.fn().mockReturnValue({ getContainerClient: vi.fn().mockReturnValue({ getBlockBlobClient: vi.fn().mockReturnValue({ uploadFile: vi.fn(), url: 'https://blob.test/file' }) }) }) },
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

function makeEnvelope(isFork: boolean) {
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
      authorLogin: 'outsider',
      isFork,
      title: 'test PR',
      body: null,
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
  mocks.mockCreateAuditEvent.mockResolvedValue({ id: 'audit-1' });
  mocks.mockCreateInitialCheck.mockResolvedValue(42);
  mocks.mockTransition.mockResolvedValue({ success: true });
  mocks.mockPollForPreview.mockResolvedValue({ status: 'resolved', url: 'https://p.example.com' });
  mocks.mockParsePRBody.mockReturnValue({ outcome: 'parse.not_found' });
  mocks.mockExtractYamlBlock.mockReturnValue({ found: false });
  mocks.mockBuildPlan.mockResolvedValue({ planId: 'plan-1', testCases: [{ name: 'Smoke', steps: [], order: 0 }] });
  mocks.mockExecuteRun.mockResolvedValue({ outcome: 'pass', steps: [], durationMs: 100 });
  mocks.mockUpsertStickyComment.mockResolvedValue(1);
  mocks.mockGetInstallationOctokit.mockResolvedValue({});
});

describe('Fork policy', () => {
  it('creates audit event when PR is from a fork', async () => {
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope(true));
    expect(mocks.mockCreateAuditEvent).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({ event_type: 'fork_policy.downgrade' }),
    );
  });

  it('creates run with smoke mode for fork PR regardless of requested mode', async () => {
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope(true));
    expect(mocks.mockCreateRun).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({ mode: RunMode.Smoke }),
    );
  });

  it('passes null parsedSteps to buildPlan for fork PR', async () => {
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope(true));
    expect(mocks.mockBuildPlan).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({ parsedSteps: null, mode: RunMode.Smoke }),
    );
  });

  it('does not create audit event for non-fork PR', async () => {
    await handlePullRequestEvent(fakePool, fakeConfig, makeEnvelope(false));
    expect(mocks.mockCreateAuditEvent).not.toHaveBeenCalled();
  });
});
