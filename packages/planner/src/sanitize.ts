// Removes content that could be used for prompt injection before sending to LLM.
// PR titles, bodies, and comment text are untrusted user input.

// Characters / sequences used in common injection attempts
const INJECTION_PATTERNS: Array<[RegExp, string]> = [
  // Instruction override attempts
  [/ignore\s+(all\s+)?previous\s+instructions?/gi, '[filtered]'],
  [/disregard\s+(all\s+)?previous\s+instructions?/gi, '[filtered]'],
  [/forget\s+(all\s+)?previous\s+instructions?/gi, '[filtered]'],
  // System prompt leaking
  [/reveal\s+(your\s+)?(system\s+)?prompt/gi, '[filtered]'],
  [/print\s+(your\s+)?(system\s+)?prompt/gi, '[filtered]'],
  // Role-play injection
  [/you\s+are\s+now\s+/gi, '[filtered]'],
  [/act\s+as\s+(if\s+you\s+(are|were)\s+)?a\s+/gi, '[filtered]'],
  // Delimiter injection (common jailbreak technique)
  [/```\s*system\b/gi, '[filtered]'],
  [/<\s*system\s*>/gi, '[filtered]'],
];

const MAX_LENGTH = 2000;

export function sanitizeForLlm(text: string): string {
  let result = text.slice(0, MAX_LENGTH);
  for (const [pattern, replacement] of INJECTION_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
