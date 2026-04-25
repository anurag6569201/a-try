// Patterns that look like secrets / tokens that should never appear in PR comments
const SECRET_PATTERNS: RegExp[] = [
  // Azure SAS tokens
  /sig=[A-Za-z0-9%+/=]{20,}/g,
  // Generic API keys / Bearer tokens (long alphanumeric strings not in URLs)
  /\b(?:key|token|secret|password|apikey|api_key|bearer)\s*[:=]\s*['"]?[A-Za-z0-9+/._-]{16,}['"]?/gi,
  // Azure connection strings
  /AccountKey=[A-Za-z0-9+/=]{30,}/g,
  // GitHub tokens
  /\b(ghp_|ghs_|gho_|github_pat_)[A-Za-z0-9_]{20,}/g,
  // JWT tokens (header.payload.signature)
  /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
];

const REDACTED = '[REDACTED]';

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, REDACTED);
  }
  return result;
}
