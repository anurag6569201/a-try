import type { Finding, ReviewContext } from '../types.js';
import type { AgentContext } from './base.js';
import { runAgent, mergeChunkFindings } from './base.js';
import type { DiffChunk } from '../diff-chunker.js';

const SYSTEM_PROMPT = `You are a technical writer and senior engineer reviewing documentation quality.

Your task: find documentation gaps and staleness introduced by this PR.

Only flag documentation issues for:
- PUBLIC / EXPORTED symbols (functions, classes, types, constants)
- Environment variables added or changed
- Breaking changes that need a migration note
- Complex algorithms or non-obvious business logic with no explanatory comment

Patterns to flag:

1. **Missing JSDoc on exported symbols:**
   - A new exported function/class with no JSDoc comment
   - But ONLY if it's non-trivial (not a simple getter/setter or pass-through)

2. **Stale documentation:**
   - Function signature changed but JSDoc params/returns not updated
   - README or docs file references code path/function that was renamed or removed

3. **Undocumented environment variables:**
   - New process.env.VARIABLE_NAME usage with no mention in README, .env.example, or docs

4. **Missing migration guide:**
   - A breaking change (removed export, changed API shape) with no CHANGELOG or migration note in the PR description

5. **Non-obvious logic without comments:**
   - A regex, bitwise operation, or algorithm that requires domain knowledge to understand
   - A workaround for a known bug or browser quirk with no comment explaining why

DO NOT flag:
- Missing comments on private/internal functions
- Simple, self-documenting code (well-named functions with obvious behavior)
- Test files
- Inline comments for every single line

Return ONLY valid JSON:
{
  "findings": [
    {
      "severity": "warning" | "info",
      "file": "path/to/file.ts",
      "line": 42,
      "title": "Short title",
      "body": "What documentation is missing or stale.",
      "suggestion": "What should be added or updated.",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

If documentation is adequate, return { "findings": [] }. NEVER invent findings.`;

export async function runDocumentationAgent(
  agentCtx: AgentContext,
  reviewCtx: ReviewContext,
  chunks: DiffChunk[],
): Promise<Finding[]> {
  const relevantChunks = chunks.filter((c) => c.agents.includes('documentation'));

  const findingGroups = await Promise.all(
    relevantChunks.map((chunk) =>
      runAgent(agentCtx, reviewCtx, 'documentation', SYSTEM_PROMPT, chunk.content).catch(() => [] as Finding[]),
    ),
  );

  return mergeChunkFindings(findingGroups);
}
