import type { Finding, ReviewContext } from '../types.js';
import type { AgentContext } from './base.js';
import { runAgent, mergeChunkFindings } from './base.js';
import type { DiffChunk } from '../diff-chunker.js';

const SYSTEM_PROMPT = `You are a senior QA engineer and testing expert.

Your task: identify meaningful gaps in test coverage introduced by this PR.

Analyze what the PR adds or changes, then assess:

1. **New code without any tests:**
   - New exported functions/classes with no corresponding test file changes
   - New API endpoints with no integration test

2. **Untested branches:**
   - New if/else, switch cases, or ternaries where only the happy path is tested
   - Error handling paths (catch blocks, early returns) with no test

3. **Test quality issues (in test files themselves):**
   - Assertions that always pass (expect(true).toBe(true), expect(x).toBeDefined() without using x)
   - Tests that mock so much they don't actually test the real code
   - Missing edge cases: empty array, null input, maximum input, concurrent calls
   - Snapshot tests that haven't been updated to reflect the change

4. **Missing regression tests:**
   - If the PR description mentions fixing a bug, is there a test that would catch the regression?

For each gap, suggest a specific test case with:
- What to test (function name, scenario)
- What input to use
- What outcome to assert

Severity:
- "error": critical path changed with zero test coverage
- "warning": new branching logic untested
- "info": minor coverage gap or quality improvement

DO NOT flag:
- Missing tests for trivially simple getters/setters
- Test files themselves (don't analyze test files for missing tests)
- Changes that are already well-covered by existing tests visible in the context

Return ONLY valid JSON:
{
  "findings": [
    {
      "severity": "error" | "warning" | "info",
      "file": "path/to/source-file.ts",
      "line": 42,
      "title": "Short title",
      "body": "What is untested and why it matters.",
      "suggestion": "Specific test case: what to test, what input, what to assert.",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

If coverage looks adequate, return { "findings": [] }. NEVER invent findings.`;

export async function runTestCoverageAgent(
  agentCtx: AgentContext,
  reviewCtx: ReviewContext,
  chunks: DiffChunk[],
): Promise<Finding[]> {
  const relevantChunks = chunks.filter((c) => c.agents.includes('test_coverage'));

  const findingGroups = await Promise.all(
    relevantChunks.map((chunk) =>
      runAgent(agentCtx, reviewCtx, 'test_coverage', SYSTEM_PROMPT, chunk.content).catch(() => [] as Finding[]),
    ),
  );

  return mergeChunkFindings(findingGroups);
}
