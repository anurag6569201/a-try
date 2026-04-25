import { createHmac, timingSafeEqual } from 'crypto';

const TOLERANCE_SECONDS = 300; // 5 minutes

export interface StripeSignatureResult {
  valid: boolean;
  payload: string;
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!signatureHeader || !secret) return false;

  // Format: t=<timestamp>,v1=<sig1>,v1=<sig2>,...
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const eqIdx = p.indexOf('=');
      return [p.slice(0, eqIdx), p.slice(eqIdx + 1)] as [string, string];
    }),
  );

  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;

  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}
