import type { ChangedFile, AgentName } from './types.js';

const MAX_CHARS_PER_CHUNK = 24_000; // ~6k tokens at 4 chars/token

export interface DiffChunk {
  filename: string;
  content: string;
  agents: AgentName[];
}

/** Splits a raw unified diff into per-file chunks and assigns specialist agents. */
export function chunkDiff(rawDiff: string, changedFiles: ChangedFile[]): DiffChunk[] {
  const fileDiffs = splitDiffByFile(rawDiff);
  const chunks: DiffChunk[] = [];

  for (const [filename, diffText] of fileDiffs) {
    const agents = assignAgents(filename);
    if (agents.length === 0) continue;

    if (diffText.length <= MAX_CHARS_PER_CHUNK) {
      chunks.push({ filename, content: diffText, agents });
    } else {
      // Split large files at function-boundary blank lines
      const subChunks = splitAtBoundaries(diffText);
      for (const sub of subChunks) {
        chunks.push({ filename, content: sub, agents });
      }
    }
  }

  // For very large PRs, prioritise files with most changes
  if (chunks.length > 300) {
    const ranked = rankByActivity(chunks, changedFiles);
    return ranked.slice(0, 300);
  }

  return chunks;
}

/** Split unified diff into a map of filename → diff text */
function splitDiffByFile(rawDiff: string): Map<string, string> {
  const result = new Map<string, string>();
  const filePattern = /^diff --git a\/.+ b\/(.+)$/m;
  const sections = rawDiff.split(/^(?=diff --git )/m);

  for (const section of sections) {
    if (!section.trim()) continue;
    const match = filePattern.exec(section);
    if (!match || !match[1]) continue;
    result.set(match[1], section);
  }

  return result;
}

/** Splits a large file diff at blank-line or hunk-header boundaries */
function splitAtBoundaries(text: string): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');
  let current: string[] = [];
  let currentLen = 0;

  for (const line of lines) {
    const isHunkHeader = line.startsWith('@@');
    if (isHunkHeader && currentLen >= MAX_CHARS_PER_CHUNK) {
      if (current.length > 0) chunks.push(current.join('\n'));
      current = [line];
      currentLen = line.length;
    } else {
      current.push(line);
      currentLen += line.length + 1;
    }
  }

  if (current.length > 0) chunks.push(current.join('\n'));
  return chunks;
}

/** Maps file extension/path to the set of agents that should review it */
function assignAgents(filename: string): AgentName[] {
  const lower = filename.toLowerCase();
  const agents: AgentName[] = [];

  // Test files: only test coverage agent
  if (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('__tests__') ||
    lower.includes('/test/')
  ) {
    return ['test_coverage'];
  }

  // Markdown / docs: documentation agent only
  if (lower.endsWith('.md') || lower.endsWith('.mdx') || lower.endsWith('.txt')) {
    return ['documentation'];
  }

  // SQL files: security + performance
  if (lower.endsWith('.sql')) {
    return ['security', 'performance'];
  }

  // Config / infra files: security + architecture
  if (
    lower.endsWith('.yml') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.json') ||
    lower.endsWith('.env') ||
    lower.endsWith('.toml') ||
    lower.includes('dockerfile') ||
    lower.includes('.github/')
  ) {
    return ['security', 'architecture'];
  }

  // TypeScript / JavaScript source: all agents
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.jsx')
  ) {
    agents.push('security', 'logic', 'type_safety', 'performance', 'test_coverage', 'architecture', 'documentation');
    return agents;
  }

  // Python, Go, Ruby, etc. — security + logic
  if (
    lower.endsWith('.py') ||
    lower.endsWith('.go') ||
    lower.endsWith('.rb') ||
    lower.endsWith('.rs')
  ) {
    return ['security', 'logic', 'performance'];
  }

  return ['security', 'logic'];
}

/** Sorts chunks by total additions+deletions of their file, descending */
function rankByActivity(chunks: DiffChunk[], changedFiles: ChangedFile[]): DiffChunk[] {
  const activityMap = new Map<string, number>();
  for (const f of changedFiles) {
    activityMap.set(f.filename, (f.additions ?? 0) + (f.deletions ?? 0));
  }
  return [...chunks].sort((a, b) => {
    const aScore = activityMap.get(a.filename) ?? 0;
    const bScore = activityMap.get(b.filename) ?? 0;
    return bScore - aScore;
  });
}
