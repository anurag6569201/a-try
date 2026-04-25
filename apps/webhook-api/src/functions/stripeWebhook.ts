import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BillingTier } from '@preview-qa/domain';
import { getPool } from '@preview-qa/db';
import {
  getInstallationByStripeCustomerId,
  updateInstallationBilling,
  recordBillingEvent,
  isBillingEventProcessed,
} from '@preview-qa/db';
import { verifyStripeSignature } from '../lib/stripeSignature.js';

const GRACE_PERIOD_DAYS = 7;

// Map Stripe price/product metadata tier names to our BillingTier enum
const STRIPE_TIER_MAP: Record<string, BillingTier> = {
  starter: BillingTier.Starter,
  growth: BillingTier.Growth,
  team: BillingTier.Team,
};

function tierFromStripeSubscription(subscription: Record<string, unknown>): BillingTier {
  const items = subscription['items'] as { data?: Array<{ price?: { metadata?: Record<string, string> } }> } | undefined;
  const tierMeta = items?.data?.[0]?.price?.metadata?.['tier'];
  return (tierMeta !== undefined ? (STRIPE_TIER_MAP[tierMeta] ?? BillingTier.Free) : BillingTier.Free);
}

export async function stripeWebhookHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('stripe-signature');
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';

  if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    context.warn('Stripe signature validation failed');
    return { status: 401, body: 'Invalid signature' };
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return { status: 400, body: 'Invalid JSON' };
  }

  const eventId = event['id'] as string | undefined;
  const eventType = event['type'] as string | undefined;
  const eventData = (event['data'] as Record<string, unknown> | undefined)?.['object'] as Record<string, unknown> | undefined;

  if (!eventId || !eventType || !eventData) {
    return { status: 400, body: 'Missing required event fields' };
  }

  const handledTypes = new Set([
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
    'invoice.payment_succeeded',
  ]);

  if (!handledTypes.has(eventType)) {
    return { status: 200, body: 'Event ignored' };
  }

  const pool = getPool();

  try {
    // Idempotency: skip already-processed events
    if (await isBillingEventProcessed(pool, eventId)) {
      context.log(`Stripe event already processed: ${eventId}`);
      return { status: 200, body: 'Already processed' };
    }

    const customerId = (eventData['customer'] as string | undefined) ?? null;
    const installation = customerId ? await getInstallationByStripeCustomerId(pool, customerId) : null;

    // Record the event regardless of whether we found the installation
    await recordBillingEvent(pool, {
      installationId: installation?.id ?? null,
      stripeEventId: eventId,
      eventType,
      payload: event,
    });

    if (!installation) {
      context.warn(`No installation found for Stripe customer: ${customerId ?? 'unknown'}`);
      return { status: 200, body: 'No matching installation' };
    }

    if (eventType === 'customer.subscription.updated') {
      const newTier = tierFromStripeSubscription(eventData);
      const subscriptionId = eventData['id'] as string | undefined;
      const anchorTs = eventData['billing_cycle_anchor'] as number | undefined;
      const billingCycleAnchor = anchorTs !== undefined ? new Date(anchorTs * 1000) : null;

      await updateInstallationBilling(pool, installation.id, {
        tier: newTier,
        ...(subscriptionId !== undefined ? { stripeSubscriptionId: subscriptionId } : {}),
        ...(billingCycleAnchor !== null ? { billingCycleAnchor } : {}),
        gracePeriodEndsAt: null,
      });
      context.log(`Updated installation ${installation.id} tier → ${newTier}`);
    }

    if (eventType === 'customer.subscription.deleted') {
      await updateInstallationBilling(pool, installation.id, {
        tier: BillingTier.Free,
        stripeSubscriptionId: null as unknown as string,
        billingCycleAnchor: null,
        gracePeriodEndsAt: null,
      });
      context.log(`Subscription cancelled for installation ${installation.id} — downgraded to free`);
    }

    if (eventType === 'invoice.payment_failed') {
      const gracePeriodEndsAt = new Date();
      gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);
      await updateInstallationBilling(pool, installation.id, { gracePeriodEndsAt });
      context.log(`Payment failed for installation ${installation.id} — grace period until ${gracePeriodEndsAt.toISOString()}`);
    }

    if (eventType === 'invoice.payment_succeeded') {
      await updateInstallationBilling(pool, installation.id, { gracePeriodEndsAt: null });
      context.log(`Payment succeeded for installation ${installation.id} — grace period cleared`);
    }

    return { status: 200, body: 'OK' };
  } catch (err) {
    context.error('Stripe webhook handler error', err);
    return { status: 500, body: 'Internal server error' };
  }
}

app.http('stripeWebhook', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'webhook/stripe',
  handler: stripeWebhookHandler,
});
