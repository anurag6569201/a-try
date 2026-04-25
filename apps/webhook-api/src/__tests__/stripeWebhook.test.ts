import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpRequest, InvocationContext } from '@azure/functions';
import { BillingTier } from '@preview-qa/domain';

const mocks = vi.hoisted(() => {
  const mockVerifyStripeSignature = vi.fn().mockReturnValue(true);
  const mockGetPool = vi.fn().mockReturnValue({});
  const mockGetInstallationByStripeCustomerId = vi.fn();
  const mockUpdateInstallationBilling = vi.fn().mockResolvedValue({ id: 'inst-1' });
  const mockRecordBillingEvent = vi.fn().mockResolvedValue(undefined);
  const mockIsBillingEventProcessed = vi.fn().mockResolvedValue(false);
  return {
    mockVerifyStripeSignature,
    mockGetPool,
    mockGetInstallationByStripeCustomerId,
    mockUpdateInstallationBilling,
    mockRecordBillingEvent,
    mockIsBillingEventProcessed,
  };
});

vi.mock('../lib/stripeSignature.js', () => ({
  verifyStripeSignature: mocks.mockVerifyStripeSignature,
}));

vi.mock('@preview-qa/db', () => ({
  getPool: mocks.mockGetPool,
  getInstallationByStripeCustomerId: mocks.mockGetInstallationByStripeCustomerId,
  updateInstallationBilling: mocks.mockUpdateInstallationBilling,
  recordBillingEvent: mocks.mockRecordBillingEvent,
  isBillingEventProcessed: mocks.mockIsBillingEventProcessed,
}));

process.env['STRIPE_WEBHOOK_SECRET'] = 'whsec_test';

import { stripeWebhookHandler } from '../functions/stripeWebhook.js';

const fakeInstallation = {
  id: 'inst-1',
  tier: BillingTier.Starter,
  grace_period_ends_at: null,
};

function makeRequest(body: object): HttpRequest {
  const raw = JSON.stringify(body);
  return {
    text: () => Promise.resolve(raw),
    headers: { get: (k: string) => (k === 'stripe-signature' ? 't=123,v1=abc' : null) },
  } as unknown as HttpRequest;
}

function makeContext(): InvocationContext {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as InvocationContext;
}

function makeSubscriptionEvent(type: string, tier = 'starter'): object {
  return {
    id: 'evt_test_001',
    type,
    data: {
      object: {
        id: 'sub_test123',
        customer: 'cus_test123',
        billing_cycle_anchor: 1700000000,
        items: {
          data: [{ price: { metadata: { tier } } }],
        },
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockVerifyStripeSignature.mockReturnValue(true);
  mocks.mockIsBillingEventProcessed.mockResolvedValue(false);
  mocks.mockGetInstallationByStripeCustomerId.mockResolvedValue(fakeInstallation);
  mocks.mockUpdateInstallationBilling.mockResolvedValue(fakeInstallation);
  mocks.mockRecordBillingEvent.mockResolvedValue(undefined);
});

describe('stripeWebhookHandler — signature', () => {
  it('returns 401 when signature is invalid', async () => {
    mocks.mockVerifyStripeSignature.mockReturnValue(false);
    const res = await stripeWebhookHandler(makeRequest({ id: 'evt_1', type: 'customer.subscription.updated', data: { object: {} } }), makeContext());
    expect(res.status).toBe(401);
  });
});

describe('stripeWebhookHandler — idempotency', () => {
  it('returns 200 Already processed for duplicate event', async () => {
    mocks.mockIsBillingEventProcessed.mockResolvedValue(true);
    const res = await stripeWebhookHandler(makeRequest(makeSubscriptionEvent('customer.subscription.updated')), makeContext());
    expect(res.status).toBe(200);
    expect(res.body).toBe('Already processed');
    expect(mocks.mockUpdateInstallationBilling).not.toHaveBeenCalled();
  });
});

describe('stripeWebhookHandler — ignored events', () => {
  it('returns 200 Event ignored for unhandled event type', async () => {
    const res = await stripeWebhookHandler(
      makeRequest({ id: 'evt_2', type: 'charge.succeeded', data: { object: { customer: 'cus_test' } } }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    expect(res.body).toBe('Event ignored');
  });
});

describe('stripeWebhookHandler — subscription.updated', () => {
  it('updates tier when subscription is updated', async () => {
    const res = await stripeWebhookHandler(makeRequest(makeSubscriptionEvent('customer.subscription.updated', 'growth')), makeContext());
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateInstallationBilling).toHaveBeenCalledWith(
      expect.anything(),
      'inst-1',
      expect.objectContaining({ tier: BillingTier.Growth, gracePeriodEndsAt: null }),
    );
  });

  it('falls back to free tier when tier metadata is missing', async () => {
    const event = makeSubscriptionEvent('customer.subscription.updated');
    const eventObj = event as Record<string, unknown>;
    const data = eventObj['data'] as Record<string, unknown>;
    const obj = data['object'] as Record<string, unknown>;
    const items = obj['items'] as Record<string, unknown>;
    (items['data'] as Array<Record<string, unknown>>)[0] = { price: { metadata: {} } };
    const res = await stripeWebhookHandler(makeRequest(event), makeContext());
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateInstallationBilling).toHaveBeenCalledWith(
      expect.anything(),
      'inst-1',
      expect.objectContaining({ tier: BillingTier.Free }),
    );
  });
});

describe('stripeWebhookHandler — subscription.deleted', () => {
  it('downgrades to free tier on cancellation', async () => {
    const res = await stripeWebhookHandler(makeRequest(makeSubscriptionEvent('customer.subscription.deleted')), makeContext());
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateInstallationBilling).toHaveBeenCalledWith(
      expect.anything(),
      'inst-1',
      expect.objectContaining({ tier: BillingTier.Free, billingCycleAnchor: null, gracePeriodEndsAt: null }),
    );
  });
});

describe('stripeWebhookHandler — invoice.payment_failed', () => {
  it('sets grace period on payment failure', async () => {
    const res = await stripeWebhookHandler(
      makeRequest({ id: 'evt_pf', type: 'invoice.payment_failed', data: { object: { customer: 'cus_test123' } } }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    const call = mocks.mockUpdateInstallationBilling.mock.calls[0] as unknown[];
    const input = call[2] as { gracePeriodEndsAt?: Date };
    expect(input?.gracePeriodEndsAt).toBeInstanceOf(Date);
    const daysUntilExpiry = (input.gracePeriodEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilExpiry).toBeGreaterThan(6);
    expect(daysUntilExpiry).toBeLessThan(8);
  });
});

describe('stripeWebhookHandler — invoice.payment_succeeded', () => {
  it('clears grace period on successful payment', async () => {
    const res = await stripeWebhookHandler(
      makeRequest({ id: 'evt_ps', type: 'invoice.payment_succeeded', data: { object: { customer: 'cus_test123' } } }),
      makeContext(),
    );
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateInstallationBilling).toHaveBeenCalledWith(
      expect.anything(),
      'inst-1',
      expect.objectContaining({ gracePeriodEndsAt: null }),
    );
  });
});

describe('stripeWebhookHandler — unknown customer', () => {
  it('records event but returns 200 when no matching installation', async () => {
    mocks.mockGetInstallationByStripeCustomerId.mockResolvedValue(null);
    const res = await stripeWebhookHandler(makeRequest(makeSubscriptionEvent('customer.subscription.updated')), makeContext());
    expect(res.status).toBe(200);
    expect(mocks.mockUpdateInstallationBilling).not.toHaveBeenCalled();
    expect(mocks.mockRecordBillingEvent).toHaveBeenCalledOnce();
  });
});
