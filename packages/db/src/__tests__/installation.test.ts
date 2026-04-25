import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingTier } from '@preview-qa/domain';
import { getInstallationById, getInstallationByGithubId, countRunsForInstallationSince, updateInstallationTier } from '../repositories/installation.js';
import type { Installation } from '../types.js';

function makePool(queryResult: object) {
  return { query: vi.fn().mockResolvedValue(queryResult) } as unknown as Parameters<typeof getInstallationById>[0];
}

const baseInstallation: Installation = {
  id: 'inst-1',
  github_id: 12345,
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

beforeEach(() => vi.clearAllMocks());

describe('getInstallationById', () => {
  it('returns installation when found', async () => {
    const pool = makePool({ rows: [baseInstallation] });
    const result = await getInstallationById(pool, 'inst-1');
    expect(result).toEqual(baseInstallation);
  });

  it('returns null when not found', async () => {
    const pool = makePool({ rows: [] });
    const result = await getInstallationById(pool, 'missing');
    expect(result).toBeNull();
  });

  it('queries by id', async () => {
    const pool = makePool({ rows: [baseInstallation] });
    await getInstallationById(pool, 'inst-1');
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const call = mockQ.mock.calls[0] as unknown[];
    expect(call[0]).toContain('WHERE id = $1');
    const params = call[1] as unknown[];
    expect(params[0]).toBe('inst-1');
  });
});

describe('getInstallationByGithubId', () => {
  it('returns installation by github_id', async () => {
    const pool = makePool({ rows: [baseInstallation] });
    const result = await getInstallationByGithubId(pool, 12345);
    expect(result).toEqual(baseInstallation);
  });

  it('returns null when not found', async () => {
    const pool = makePool({ rows: [] });
    const result = await getInstallationByGithubId(pool, 99999);
    expect(result).toBeNull();
  });
});

describe('countRunsForInstallationSince', () => {
  it('returns parsed count', async () => {
    const pool = makePool({ rows: [{ count: '42' }] });
    const result = await countRunsForInstallationSince(pool, 'inst-1', new Date('2024-01-01'));
    expect(result).toBe(42);
  });

  it('returns 0 when no rows', async () => {
    const pool = makePool({ rows: [{ count: '0' }] });
    const result = await countRunsForInstallationSince(pool, 'inst-1', new Date());
    expect(result).toBe(0);
  });

  it('passes installationId and since date as params', async () => {
    const since = new Date('2024-06-01');
    const pool = makePool({ rows: [{ count: '5' }] });
    await countRunsForInstallationSince(pool, 'inst-2', since);
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const params = (mockQ.mock.calls[0] as unknown[])[1] as unknown[];
    expect(params[0]).toBe('inst-2');
    expect(params[1]).toBe(since);
  });
});

describe('updateInstallationTier', () => {
  it('returns updated installation', async () => {
    const updated = { ...baseInstallation, tier: BillingTier.Starter };
    const pool = makePool({ rows: [updated] });
    const result = await updateInstallationTier(pool, 'inst-1', BillingTier.Starter);
    expect(result?.tier).toBe(BillingTier.Starter);
  });

  it('returns null when installation not found', async () => {
    const pool = makePool({ rows: [] });
    const result = await updateInstallationTier(pool, 'missing', BillingTier.Growth);
    expect(result).toBeNull();
  });
});
