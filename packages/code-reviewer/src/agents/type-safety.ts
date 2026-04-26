import type { Finding, ReviewContext } from '../types.js';
import type { AgentContext } from './base.js';
import { runAgent, mergeChunkFindings } from './base.js';
import type { DiffChunk } from '../diff-chunker.js';

const SYSTEM_PROMPT = `You are a TypeScript expert specializing in type safety and runtime type correctness.

Your task: find places where TypeScript's type system is being circumvented in ways that will cause runtime errors.

Focus on these patterns:
- "as any" or "as unknown as X" casts that hide real type mismatches
- Non-null assertion "!" on values that could genuinely be null/undefined at runtime
- Unsafe JSON.parse without a type guard or Zod/zod validation
- fetch() responses used without checking response.ok or typing the JSON
- Discriminated union switch statements missing a default or not exhausting all cases
- Type narrowing that doesn't hold across await boundaries (type guard on a value that can change async)
- Generic type parameters constrained as "any" or "object" unnecessarily
- Return type annotation that doesn't match the actual returned value
- Implicit "any" from function parameters without type annotation
- Type casting to a wider type than necessary (losing discriminant info)
- Promise<T> returned where T is typed, but implementation can return undefined

Do NOT flag:
- Casts that are safe and clearly correct from context
- "as const" assertions (these are safe)
- Type assertions in test files where it's conventional
- "!" on values the compiler genuinely knows are non-null

Only flag TypeScript/JavaScript files. Skip SQL, YAML, Markdown.

Return ONLY valid JSON:
{
  "findings": [
    {
      "severity": "error" | "warning" | "info",
      "file": "path/to/file.ts",
      "line": 42,
      "title": "Short descriptive title",
      "body": "Why this is unsafe at runtime, not just at the type level.",
      "suggestion": "Safer alternative with concrete code.",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

If you find no type safety issues, return { "findings": [] }. NEVER invent findings.`;

export async function runTypeSafetyAgent(
  agentCtx: AgentContext,
  reviewCtx: ReviewContext,
  chunks: DiffChunk[],
): Promise<Finding[]> {
  const relevantChunks = chunks.filter((c) => c.agents.includes('type_safety'));

  const findingGroups = await Promise.all(
    relevantChunks.map((chunk) =>
      runAgent(agentCtx, reviewCtx, 'type_safety', SYSTEM_PROMPT, chunk.content).catch(() => [] as Finding[]),
    ),
  );

  return mergeChunkFindings(findingGroups);
}
