import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../redact.js';

describe('redactSecrets', () => {
  it('passes through clean text unchanged', () => {
    const text = 'Preview QA passed in 1.2s — all 3 steps green.';
    expect(redactSecrets(text)).toBe(text);
  });

  it('redacts Azure SAS token sig= parameter', () => {
    const text = 'https://blob.core.windows.net/artifacts/trace.zip?sig=abcdefghijklmnopqrstuvwxyz1234567890%2Bmore&sv=2021';
    const result = redactSecrets(text);
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts Azure AccountKey in connection string', () => {
    const text = 'DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=dGVzdGtleXZhbHVlMTIzNDU2Nzg5MGFiY2RlZg==;EndpointSuffix=core.windows.net';
    const result = redactSecrets(text);
    expect(result).not.toContain('dGVzdGtleXZhbHVlMTIzNDU2Nzg5MGFiY2RlZg==');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts GitHub personal access tokens', () => {
    const text = 'token: ghp_1234567890abcdefghijklmnopqrstu';
    const result = redactSecrets(text);
    expect(result).not.toContain('ghp_1234567890abcdefghijklmnopqrstu');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts JWT tokens', () => {
    const text = 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const result = redactSecrets(text);
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts multiple secrets in a single string', () => {
    const text = 'key=abc123def456ghi789 and sig=xyz987uvw654rst321qpo';
    const result = redactSecrets(text);
    expect(result).not.toContain('abc123def456ghi789');
    expect(result).toContain('[REDACTED]');
  });
});
