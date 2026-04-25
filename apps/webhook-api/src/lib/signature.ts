import { createHmac, timingSafeEqual } from 'crypto';

export function verifyGitHubSignature(
  payload: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;

  try {
    return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    // Buffers differ in length — not equal
    return false;
  }
}
