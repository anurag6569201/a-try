import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => {
  const mockGetInstallationById = vi.fn();
  const mockGetRepositoriesForInstallation = vi.fn().mockResolvedValue([]);
  const mockCountRunsForInstallationInMonth = vi.fn().mockResolvedValue(0);
  const mockGetRepositoryById = vi.fn();
  const mockUpdateRepositoryConfig = vi.fn();
  const mockGetRunsForRepository = vi.fn().mockResolvedValue([]);
  const mockGetResultsForRun = vi.fn().mockResolvedValue([]);
  const mockGetArtifactsForRun = vi.fn().mockResolvedValue([]);
  const mockGetModelTracesForRun = vi.fn().mockResolvedValue([]);
  const mockPoolQuery = vi.fn().mockResolvedValue({ rows: [] });
  return {
    mockGetInstallationById,
    mockGetRepositoriesForInstallation,
    mockCountRunsForInstallationInMonth,
    mockGetRepositoryById,
    mockUpdateRepositoryConfig,
    mockGetRunsForRepository,
    mockGetResultsForRun,
    mockGetArtifactsForRun,
    mockGetModelTracesForRun,
    mockPoolQuery,
  };
});

vi.mock('@preview-qa/db', () => ({
  getInstallationById: mocks.mockGetInstallationById,
  getRepositoriesForInstallation: mocks.mockGetRepositoriesForInstallation,
  countRunsForInstallationInMonth: mocks.mockCountRunsForInstallationInMonth,
  getRepositoryById: mocks.mockGetRepositoryById,
  updateRepositoryConfig: mocks.mockUpdateRepositoryConfig,
  getRunsForRepository: mocks.mockGetRunsForRepository,
  getResultsForRun: mocks.mockGetResultsForRun,
  getArtifactsForRun: mocks.mockGetArtifactsForRun,
  getModelTracesForRun: mocks.mockGetModelTracesForRun,
}));

import { createApp } from '../app.js';
import { BillingTier } from '@preview-qa/domain';

const fakePool = { query: mocks.mockPoolQuery } as never;

const fakeInstallation = {
  id: 'inst-1',
  github_id: 100,
  account_login: 'acme',
  account_type: 'Organization',
  tier: BillingTier.Free,
  suspended_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  billing_cycle_anchor: null,
  grace_period_ends_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const fakeRepo = {
  id: 'repo-1',
  installation_id: 'inst-1',
  github_id: 200,
  full_name: 'acme/myapp',
  default_branch: 'main',
  config: {},
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

beforeEach(() => vi.clearAllMocks());

describe('Dashboard routes', () => {
  const app = createApp(fakePool);

  it('GET / redirects to /installations', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('/installations');
  });

  it('GET /installations lists installations', async () => {
    mocks.mockPoolQuery.mockResolvedValue({
      rows: [{ ...fakeInstallation }],
    });
    const res = await request(app).get('/installations');
    expect(res.status).toBe(200);
    expect(res.text).toContain('acme');
    expect(res.text).toContain('Installations');
  });

  it('GET /installations/:id shows installation detail', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(fakeInstallation);
    mocks.mockGetRepositoriesForInstallation.mockResolvedValue([fakeRepo]);
    mocks.mockCountRunsForInstallationInMonth.mockResolvedValue(10);
    const res = await request(app).get('/installations/inst-1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('acme');
    expect(res.text).toContain('acme/myapp');
    expect(res.text).toContain('10');
  });

  it('GET /installations/:id returns 404 when not found', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(null);
    const res = await request(app).get('/installations/missing');
    expect(res.status).toBe(404);
  });

  it('GET /installations/:id/repos/:repoId shows run history', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(fakeInstallation);
    mocks.mockGetRepositoryById.mockResolvedValue(fakeRepo);
    mocks.mockGetRunsForRepository.mockResolvedValue([]);
    const res = await request(app).get('/installations/inst-1/repos/repo-1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('acme/myapp');
    expect(res.text).toContain('Run History');
  });

  it('GET /installations/:id/repos/:repoId/config shows config editor', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(fakeInstallation);
    mocks.mockGetRepositoryById.mockResolvedValue(fakeRepo);
    const res = await request(app).get('/installations/inst-1/repos/repo-1/config');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Repo Config');
    expect(res.text).toContain('textarea');
  });

  it('POST /installations/:id/repos/:repoId/config saves valid JSON', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(fakeInstallation);
    mocks.mockGetRepositoryById.mockResolvedValue(fakeRepo);
    mocks.mockUpdateRepositoryConfig.mockResolvedValue(fakeRepo);
    const res = await request(app)
      .post('/installations/inst-1/repos/repo-1/config')
      .send('config=%7B%7D');
    expect(res.status).toBe(302);
    expect(mocks.mockUpdateRepositoryConfig).toHaveBeenCalledOnce();
  });

  it('POST /installations/:id/repos/:repoId/config rejects invalid JSON', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(fakeInstallation);
    mocks.mockGetRepositoryById.mockResolvedValue(fakeRepo);
    const res = await request(app)
      .post('/installations/inst-1/repos/repo-1/config')
      .send('config=not-json');
    expect(res.status).toBe(400);
  });

  it('GET /installations/:id/repos/:repoId/runs/:runId shows run detail', async () => {
    mocks.mockGetInstallationById.mockResolvedValue(fakeInstallation);
    mocks.mockGetRepositoryById.mockResolvedValue(fakeRepo);
    mocks.mockGetResultsForRun.mockResolvedValue([]);
    mocks.mockGetArtifactsForRun.mockResolvedValue([]);
    mocks.mockGetModelTracesForRun.mockResolvedValue([]);
    const res = await request(app).get('/installations/inst-1/repos/repo-1/runs/run-abc');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Step Outcomes');
    expect(res.text).toContain('Artifacts');
    expect(res.text).toContain('Model Traces');
  });
});
