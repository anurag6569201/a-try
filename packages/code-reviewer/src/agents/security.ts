import type { Finding, ReviewContext } from '../types.js';
import type { AgentContext } from './base.js';
import { runAgent, mergeChunkFindings } from './base.js';
import type { DiffChunk } from '../diff-chunker.js';
import { fetchCVEs } from '../osv.js';

const SYSTEM_PROMPT = `You are a senior application security engineer with deep expertise in OWASP Top 10, CWE/SANS, and JavaScript/TypeScript security.

Your task: analyze the code change and find REAL, EXPLOITABLE security vulnerabilities only.

A finding is "real" only if ALL THREE conditions hold:
1. The vulnerability exists in this specific code (not hypothetical).
2. It is exploitable by an attacker or causes a real security risk.
3. It is NOT already mitigated by surrounding context visible in the diff or file content.

DO NOT flag:
- Variables named "secret" or "key" when they hold config keys (not actual secrets)
- Theoretical vulnerabilities with no realistic attack path
- Issues already guarded by earlier validation
- Test files or mock data
- eslint-disable comments

Categories to look for:
- Hardcoded credentials, API keys, tokens, passwords in source code
- SQL injection via string interpolation (even with template literals)
- Command injection (exec, spawn with user-controlled args)
- XSS via dangerouslySetInnerHTML or direct DOM manipulation with user input
- IDOR: data access without authorization check
- Path traversal: fs operations with user-controlled paths
- SSRF: outbound HTTP calls with user-controlled URLs
- Prototype pollution: spreading untrusted objects into base objects
- Mass assignment: REST endpoints accepting req.body spread without allowlist
- Insecure deserialization
- Missing rate limiting on sensitive endpoints
- JWT/session token mishandling
- Timing attacks in equality comparisons for secrets

For each finding, estimate severity:
- "error": directly exploitable, high impact
- "warning": exploitable under certain conditions, or sensitive data exposure
- "info": best practice violation, defense-in-depth concern

Return ONLY valid JSON (no markdown fences):
{
  "findings": [
    {
      "severity": "error" | "warning" | "info",
      "file": "path/to/file.ts",
      "line": 42,
      "title": "Short title (< 10 words)",
      "body": "Explanation of why this is a vulnerability and how it could be exploited.",
      "suggestion": "Concrete code fix or mitigation.",
      "confidence": "high" | "medium" | "low",
      "cwe": "CWE-89"
    }
  ]
}

If you find no real security issues, return { "findings": [] }. NEVER invent findings.`;

export async function runSecurityAgent(
  agentCtx: AgentContext,
  reviewCtx: ReviewContext,
  chunks: DiffChunk[],
): Promise<Finding[]> {
  const relevantChunks = chunks.filter((c) => c.agents.includes('security'));

  // Fetch CVE context for any new dependencies added in the diff
  const addedDeps = extractAddedDependencies(reviewCtx.diff);
  let cveContext = '';
  if (addedDeps.length > 0) {
    const cves = await Promise.allSettled(addedDeps.map((dep) => fetchCVEs(dep)));
    const cveLines: string[] = [];
    cves.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.length > 0) {
        const dep = addedDeps[i];
        cveLines.push(`${dep}: ${r.value.map((c) => c.id).join(', ')}`);
      }
    });
    if (cveLines.length > 0) {
      cveContext = `\n## Known CVEs in newly added dependencies\n${cveLines.join('\n')}`;
    }
  }

  const findingGroups = await Promise.all(
    relevantChunks.map((chunk) =>
      runAgent(agentCtx, reviewCtx, 'security', SYSTEM_PROMPT, chunk.content, cveContext).catch(() => [] as Finding[]),
    ),
  );

  return mergeChunkFindings(findingGroups);
}

function extractAddedDependencies(diff: string): string[] {
  const deps: string[] = [];
  // Match lines like: +    "some-package": "^1.2.3"  in package.json diffs
  const pattern = /^\+\s+"([a-z@][a-z0-9\-./]+)":\s+"[\^~]?[\d.]+"/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(diff)) !== null) {
    if (match[1] && !match[1].startsWith('@preview-qa')) {
      deps.push(match[1]);
    }
  }
  return [...new Set(deps)].slice(0, 10); // cap at 10 to avoid spamming OSV
}
