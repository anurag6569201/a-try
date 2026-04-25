import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingTier } from '@preview-qa/domain';
import {
  getInstallationByStripeCustomerId,
  updateInstallationBilling,
  recordBillingEvent,
  isBillingEventProcessed,
} from '../repositories/installation.js';
import type { Installation } from '../types.js';

function makePool(queryResult: object) {
  return { query: vi.fn().mockResolvedValue(queryResult) } as unknown as Parameters<typeof getInstallationByStripeCustomerId>[0];
}

const baseInstallation: Installation = {
  id: 'inst-1',
  github_id: 12345,
  account_login: 'acme',
  account_type: 'Organization',
  tier: BillingTier.Starter,
  suspended_at: null,
  stripe_customer_id: 'cus_test123',
  stripe_subscription_id: 'sub_test123',
  billing_cycle_anchor: new Date('2024-01-01'),
  grace_period_ends_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

beforeEach(() => vi.clearAllMocks());

describe('getInstallationByStripeCustomerId', () => {
  it('returns installation when found', async () => {
    const pool = makePool({ rows: [baseInstallation] });
    const result = await getInstallationByStripeCustomerId(pool, 'cus_test123');
    expect(result).toEqual(baseInstallation);
  });

  it('returns null when not found', async () => {
    const pool = makePool({ rows: [] });
    const result = await getInstallationByStripeCustomerId(pool, 'cus_unknown');
    expect(result).toBeNull();
  });

  it('queries by stripe_customer_id', async () => {
    const pool = makePool({ rows: [baseInstallation] });
    await getInstallationByStripeCustomerId(pool, 'cus_test123');
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const call = mockQ.mock.calls[0] as unknown[];
    expect(call[0]).toContain('stripe_customer_id = $1');
    const params = call[1] as unknown[];
    expect(params[0]).toBe('cus_test123');
  });
});

describe('updateInstallationBilling', () => {
  it('updates tier', async () => {
    const updated = { ...baseInstallation, tier: BillingTier.Growth };
    const pool = makePool({ rows: [updated] });
    const result = await updateInstallationBilling(pool, 'inst-1', { tier: BillingTier.Growth });
    expect(result?.tier).toBe(BillingTier.Growth);
  });

  it('sets grace period', async () => {
    const gracePeriodEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = { ...baseInstallation, grace_period_ends_at: gracePeriodEndsAt };
    const pool = makePool({ rows: [updated] });
    const result = await updateInstallationBilling(pool, 'inst-1', { gracePeriodEndsAt });
    expect(result?.grace_period_ends_at).toEqual(gracePeriodEndsAt);
  });

  it('clears grace period with null', async () => {
    const updated = { ...baseInstallation, grace_period_ends_at: null };
    const pool = makePool({ rows: [updated] });
    const result = await updateInstallationBilling(pool, 'inst-1', { gracePeriodEndsAt: null });
    expect(result?.grace_period_ends_at).toBeNull();
  });

  it('updates stripe subscription id', async () => {
    const updated = { ...baseInstallation, stripe_subscription_id: 'sub_new' };
    const pool = makePool({ rows: [updated] });
    const result = await updateInstallationBilling(pool, 'inst-1', { stripeSubscriptionId: 'sub_new' });
    expect(result?.stripe_subscription_id).toBe('sub_new');
  });

  it('returns null when installation not found', async () => {
    const pool = makePool({ rows: [] });
    const result = await updateInstallationBilling(pool, 'missing', { tier: BillingTier.Free });
    expect(result).toBeNull();
  });
});

describe('recordBillingEvent', () => {
  it('inserts billing event with ON CONFLICT DO NOTHING', async () => {
    const pool = makePool({ rowCount: 1 });
    await recordBillingEvent(pool, {
      installationId: 'inst-1',
      stripeEventId: 'evt_test123',
      eventType: 'customer.subscription.updated',
      payload: { id: 'evt_test123' },
    });
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const call = mockQ.mock.calls[0] as unknown[];
    expect(call[0]).toContain('INSERT INTO billing_event');
    expect(call[0]).toContain('ON CONFLICT');
    expect(call[0]).toContain('DO NOTHING');
    const params = call[1] as unknown[];
    expect(params[0]).toBe('inst-1');
    expect(params[1]).toBe('evt_test123');
    expect(params[2]).toBe('customer.subscription.updated');
  });

  it('accepts null installationId', async () => {
    const pool = makePool({ rowCount: 0 });
    await recordBillingEvent(pool, {
      installationId: null,
      stripeEventId: 'evt_unknown',
      eventType: 'invoice.payment_failed',
      payload: {},
    });
    const mockQ = pool.query as ReturnType<typeof vi.fn>;
    const params = (mockQ.mock.calls[0] as unknown[])[1] as unknown[];
    expect(params[0]).toBeNull();
  });
});

describe('isBillingEventProcessed', () => {
  it('returns true when event exists', async () => {
    const pool = makePool({ rows: [{ id: 'be-1' }] });
    const result = await isBillingEventProcessed(pool, 'evt_test123');
    expect(result).toBe(true);
  });

  it('returns false when event does not exist', async () => {
    const pool = makePool({ rows: [] });
    const result = await isBillingEventProcessed(pool, 'evt_new');
    expect(result).toBe(false);
  });
});
