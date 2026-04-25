import { load as yamlLoad } from 'js-yaml';
import { ParseOutcome } from '@preview-qa/domain';
import { extractYamlBlock } from './extract.js';
import { QABlockSchema } from './schema.js';
import type { QABlock } from './schema.js';

export type ParseResult =
  | { outcome: ParseOutcome.Found; block: QABlock }
  | { outcome: ParseOutcome.NotFound }
  | { outcome: ParseOutcome.Error; errors: string[] };

export function parsePRBody(prBody: string | null): ParseResult {
  const extracted = extractYamlBlock(prBody);

  if (!extracted.found) {
    return { outcome: ParseOutcome.NotFound };
  }

  let raw: unknown;
  try {
    raw = yamlLoad(extracted.yaml);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      outcome: ParseOutcome.Error,
      errors: [`YAML syntax error: ${message}`],
    };
  }

  const result = QABlockSchema.safeParse(raw);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    });
    return { outcome: ParseOutcome.Error, errors };
  }

  return { outcome: ParseOutcome.Found, block: result.data };
}

export function formatParseErrors(errors: string[]): string {
  const lines = [
    '**Preview QA — Configuration Error**',
    '',
    'Your `previewqa` block has the following issues:',
    '',
    ...errors.map((e) => `- ${e}`),
    '',
    '<details>',
    '<summary>Example valid block</summary>',
    '',
    '````markdown',
    '<!-- previewqa:start -->',
    'version: 1',
    'steps:',
    '  - type: navigate',
    '    url: https://your-preview-url.vercel.app',
    '  - type: assert_title',
    '    value: My App',
    '  - type: screenshot',
    '    label: home',
    '<!-- previewqa:end -->',
    '````',
    '',
    '</details>',
  ];
  return lines.join('\n');
}
