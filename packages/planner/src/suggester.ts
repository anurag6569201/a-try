import type { Pool } from 'pg';
import { runPlanSuggester } from '@preview-qa/ai';
import type { OpenAILike, PlanSuggestion } from '@preview-qa/ai';
import type { ParsedStep } from '@preview-qa/parser';

export interface SuggesterInput {
  runId: string;
  changedFiles: string[];
  existingSteps: ParsedStep[];
  previewUrl: string;
  deployment: string;
}

export async function suggestMissingCoverage(
  client: OpenAILike,
  pool: Pool,
  input: SuggesterInput,
): Promise<PlanSuggestion[]> {
  const existingSteps = input.existingSteps.map((s) => {
    const step = s as Record<string, unknown>;
    return {
      type: String(step['type'] ?? ''),
      ...(step['url'] !== undefined ? { url: String(step['url']) } : {}),
      ...(step['selector'] !== undefined ? { selector: String(step['selector']) } : {}),
      ...(step['label'] !== undefined ? { label: String(step['label']) } : {}),
    };
  });

  const result = await runPlanSuggester(
    client as Parameters<typeof runPlanSuggester>[0],
    pool,
    input.deployment,
    {
      changedFiles: input.changedFiles,
      existingSteps,
      previewUrl: input.previewUrl,
    },
    { runId: input.runId, promptName: 'plan_suggester' },
  );

  return result.suggestions;
}

export function formatSuggestionComment(suggestions: PlanSuggestion[]): string {
  if (suggestions.length === 0) {
    return '';
  }

  const rows = suggestions
    .map((s) => `| \`${s.route}\` | ${s.stepType} | ${s.reason} |`)
    .join('\n');

  return [
    '### 💡 Preview QA — Coverage Suggestions',
    '',
    'Based on the changed files, the following routes may need additional test coverage:',
    '',
    '| Route | Step type | Reason |',
    '|-------|-----------|--------|',
    rows,
    '',
    '<sub>These are informational suggestions only — your existing QA block is unchanged.</sub>',
  ].join('\n');
}
