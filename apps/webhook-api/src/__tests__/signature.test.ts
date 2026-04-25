import { describe, it, expect } from 'vitest';
import { createHmac } from 'crypto';
import { verifyGitHubSignature } from '../lib/signature';

const SECRET = 'test-secret';
const PAYLOAD = JSON.stringify({ action: 'opened' });

function makeSignature(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

describe('verifyGitHubSignature', () => {
  it('returns true for a valid signature', () => {
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyGitHubSignature(PAYLOAD, sig, SECRET)).toBe(true);
  });

  it('returns false for a wrong secret', () => {
    const sig = makeSignature(PAYLOAD, 'wrong-secret');
    expect(verifyGitHubSignature(PAYLOAD, sig, SECRET)).toBe(false);
  });

  it('returns false for a tampered payload', () => {
    const sig = makeSignature(PAYLOAD, SECRET);
    expect(verifyGitHubSignature('{"action":"closed"}', sig, SECRET)).toBe(false);
  });

  it('returns false for a null signature', () => {
    expect(verifyGitHubSignature(PAYLOAD, null, SECRET)).toBe(false);
  });

  it('returns false for an undefined signature', () => {
    expect(verifyGitHubSignature(PAYLOAD, undefined, SECRET)).toBe(false);
  });

  it('returns false for a signature missing sha256= prefix', () => {
    const raw = createHmac('sha256', SECRET).update(PAYLOAD).digest('hex');
    expect(verifyGitHubSignature(PAYLOAD, raw, SECRET)).toBe(false);
  });

  it('returns false for an empty signature', () => {
    expect(verifyGitHubSignature(PAYLOAD, '', SECRET)).toBe(false);
  });
});
