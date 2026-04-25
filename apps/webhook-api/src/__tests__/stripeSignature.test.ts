import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyStripeSignature } from '../lib/stripeSignature.js';

function makeSignature(payload: string, secret: string, timestamp: number): string {
  const signed = `${timestamp}.${payload}`;
  const sig = createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

const secret = 'whsec_test_secret';
const now = Math.floor(Date.now() / 1000);

describe('verifyStripeSignature', () => {
  it('accepts a valid signature', () => {
    const payload = '{"id":"evt_1"}';
    const header = makeSignature(payload, secret, now);
    expect(verifyStripeSignature(payload, header, secret, now)).toBe(true);
  });

  it('rejects a tampered payload', () => {
    const header = makeSignature('{"id":"evt_1"}', secret, now);
    expect(verifyStripeSignature('{"id":"evt_tampered"}', header, secret, now)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const payload = '{"id":"evt_1"}';
    const header = makeSignature(payload, 'wrong_secret', now);
    expect(verifyStripeSignature(payload, header, secret, now)).toBe(false);
  });

  it('rejects when timestamp is too old (replay attack)', () => {
    const payload = '{"id":"evt_1"}';
    const oldTs = now - 400; // > 300s tolerance
    const header = makeSignature(payload, secret, oldTs);
    expect(verifyStripeSignature(payload, header, secret, now)).toBe(false);
  });

  it('accepts when timestamp is within tolerance', () => {
    const payload = '{"id":"evt_1"}';
    const recentTs = now - 200;
    const header = makeSignature(payload, secret, recentTs);
    expect(verifyStripeSignature(payload, header, secret, now)).toBe(true);
  });

  it('rejects missing signature header', () => {
    expect(verifyStripeSignature('payload', null, secret, now)).toBe(false);
    expect(verifyStripeSignature('payload', undefined, secret, now)).toBe(false);
  });

  it('rejects empty secret', () => {
    const payload = '{"id":"evt_1"}';
    const header = makeSignature(payload, secret, now);
    expect(verifyStripeSignature(payload, header, '', now)).toBe(false);
  });

  it('rejects malformed header with no v1', () => {
    expect(verifyStripeSignature('payload', `t=${now}`, secret, now)).toBe(false);
  });
});
