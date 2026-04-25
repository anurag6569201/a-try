import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RunMode } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockGetInstallationOctokit = vi.fn().mockResolvedValue({});
  const mockIsCollaborator = vi.fn();
  const mockPostComment = vi.fn().mockResolvedValue(1);
  const mockGetPRMetadata = vi.fn();
  const mockGetPullRequestByRepoAndNumber = vi.fn();
  const mockGetLatestRunForPR = vi.fn();
  const mockCancelSupersededRuns = vi.fn().mockResolvedValue(0);
  const mockCountRerunsForPRSince = vi.fn().mockResolvedValue(0);
  const mockGetInstallationById = vi.fn().mockResolvedValue({ tier: 'free' });
  const mockCountRunsForInstallationSince = vi.fn().mockResolvedValue(0);
  const mockCreateRun = vi.fn();
  return {
    mockGetInstallationOctokit,
    mockIsCollaborator,
    mockPostComment,
    mockGetPRMetadata,
    mockGetPullRequestByRepoAndNumber,
    mockGetLatestRunForPR,
    mockCancelSupersededRuns,
    mockCountRerunsForPRSince,
    mockGetInstallationById,
    mockCountRunsForInstallationSince,
    mockCreateRun,
  };
});

vi.mock('@preview-qa/github-adapter', () => ({
  getInstallationOctokit: mocks.mockGetInstallationOctokit,
  isCollaborator: mocks.mockIsCollaborator,
  postComment: mocks.mockPostComment,
  getPRMetadata: mocks.mockGetPRMetadata,
}));

vi.mock('@preview-qa/db', () => ({
  getPullRequestByRepoAndNumber: mocks.mockGetPullRequestByRepoAndNumber,
  getLatestRunForPR: mocks.mockGetLatestRunForPR,
  cancelSupersededRuns: mocks.mockCancelSupersededRuns,
  countRerunsForPRSince: mocks.mockCountRerunsForPRSince,
  getInstallationById: mocks.mockGetInstallationById,
  countRunsForInstallationSince: mocks.mockCountRunsForInstallationSince,
  createRun: mocks.mockCreateRun,
}));

import { handleIssueCommentEvent } from '../handlers/issueComment.js';

const fakePool = {} as Parameters<typeof handleIssueCommentEvent>[0];
const fakeConfig = {
  serviceBusConnectionString: '',
  queueName: '',
  dbConnectionString: '',
  github: { appId: 1, privateKey: 'pk' },
  vercel: { apiToken: 'v' },
  storage: { connectionString: '', containerName: 'a' },
};

function makeEnvelope(body: string, authorLogin = 'alice') {
  return {
    messageId: '00000000-0000-0000-0000-000000000001',
    eventType: 'issue_comment.created' as never,
    installationId: '111',
    repositoryId: 'repo-uuid-1',
    correlationId: '00000000-0000-0000-0000-000000000002',
    occurredAt: new Date().toISOString(),
    payload: {
      githubNumber: 42,
      commentId: 9,
      body,
      authorLogin,
      repositoryFullName: 'acme/myapp',
    },
  };
}

const fakePR = {
  id: 'pr-uuid-1',
  repository_id: 'repo-uuid-1',
  github_number: 42,
  title: 'My PR',
  author_login: 'alice',
  head_sha: 'old-sha',
  head_branch: 'feat/x',
  base_branch: 'main',
  is_fork: false,
  body: null,
  state: 'open',
  created_at: new Date(),
  updated_at: new Date(),
  mode: RunMode.Instruction,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockGetInstallationOctokit.mockResolvedValue({});
  mocks.mockPostComment.mockResolvedValue(1);
  mocks.mockCancelSupersededRuns.mockResolvedValue(0);
  mocks.mockCreateRun.mockResolvedValue({ id: 'run-new' });
  mocks.mockGetPRMetadata.mockResolvedValue({ headSha: 'abc123sha' });
});

describe('handleIssueCommentEvent — authorization', () => {
  it('posts unauthorized message when commenter is not a collaborator', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(false);
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun', 'outsider'));
    expect(mocks.mockPostComment).toHaveBeenCalledWith(
      expect.anything(),
      'acme',
      'myapp',
      42,
      expect.stringContaining('Only repository collaborators'),
    );
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
  });

  it('proceeds when commenter is a collaborator', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockGetLatestRunForPR.mockResolvedValue({ mode: RunMode.Instruction });
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun'));
    expect(mocks.mockCreateRun).toHaveBeenCalledTimes(1);
  });
});

describe('handleIssueCommentEvent — /qa help', () => {
  it('posts help message without creating a run', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa help'));
    expect(mocks.mockPostComment).toHaveBeenCalledWith(
      expect.anything(),
      'acme',
      'myapp',
      42,
      expect.stringContaining('/qa rerun'),
    );
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
  });
});

describe('handleIssueCommentEvent — /qa smoke', () => {
  it('creates run with smoke mode and smoke_command trigger', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa smoke'));
    expect(mocks.mockCreateRun).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({
        mode: RunMode.Smoke,
        triggered_by: 'smoke_command',
        sha: 'abc123sha',
      }),
    );
  });
});

describe('handleIssueCommentEvent — /qa rerun', () => {
  it('creates run preserving last run mode', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockGetLatestRunForPR.mockResolvedValue({ mode: RunMode.Hybrid });
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun'));
    expect(mocks.mockCreateRun).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({
        mode: RunMode.Hybrid,
        triggered_by: 'rerun_command',
      }),
    );
  });

  it('falls back to smoke mode when no previous run exists', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockGetLatestRunForPR.mockResolvedValue(null);
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun'));
    expect(mocks.mockCreateRun).toHaveBeenCalledWith(
      fakePool,
      expect.objectContaining({ mode: RunMode.Smoke }),
    );
  });

  it('posts guidance comment when PR not found in DB', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(null);
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun'));
    expect(mocks.mockPostComment).toHaveBeenCalledWith(
      expect.anything(),
      'acme',
      'myapp',
      42,
      expect.stringContaining('not processed this PR yet'),
    );
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
  });

  it('cancels superseded runs before creating new run', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockGetLatestRunForPR.mockResolvedValue({ mode: RunMode.Smoke });
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun'));
    expect(mocks.mockCancelSupersededRuns).toHaveBeenCalledWith(fakePool, 'pr-uuid-1', 'abc123sha');
    expect(mocks.mockCreateRun).toHaveBeenCalledTimes(1);
  });
});

describe('handleIssueCommentEvent — non-qa comment', () => {
  it('ignores comments that do not start with /qa', async () => {
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('looks good to me!'));
    expect(mocks.mockIsCollaborator).not.toHaveBeenCalled();
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
  });
});

describe('handleIssueCommentEvent — rerun rate limit', () => {
  it('creates run when rerun count is below the limit', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockGetLatestRunForPR.mockResolvedValue({ mode: RunMode.Smoke });
    mocks.mockCountRerunsForPRSince.mockResolvedValue(3);
    await handleIssueCommentEvent(fakePool, { ...fakeConfig, rerunRateLimitPerHour: 5 }, makeEnvelope('/qa rerun'));
    expect(mocks.mockCreateRun).toHaveBeenCalledOnce();
  });

  it('blocks run and posts comment when rate limit is reached', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockCountRerunsForPRSince.mockResolvedValue(5);
    await handleIssueCommentEvent(fakePool, { ...fakeConfig, rerunRateLimitPerHour: 5 }, makeEnvelope('/qa rerun'));
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
    expect(mocks.mockPostComment).toHaveBeenCalledWith(
      expect.anything(),
      'acme',
      'myapp',
      42,
      expect.stringContaining('rate limit'),
    );
  });

  it('uses default rate limit of 5 when not configured', async () => {
    mocks.mockIsCollaborator.mockResolvedValue(true);
    mocks.mockGetPullRequestByRepoAndNumber.mockResolvedValue(fakePR);
    mocks.mockCountRerunsForPRSince.mockResolvedValue(5);
    await handleIssueCommentEvent(fakePool, fakeConfig, makeEnvelope('/qa rerun'));
    expect(mocks.mockCreateRun).not.toHaveBeenCalled();
  });
});
