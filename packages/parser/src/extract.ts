const BLOCK_START = '<!-- previewqa:start -->';
const BLOCK_END = '<!-- previewqa:end -->';

export type ExtractionResult =
  | { found: true; yaml: string }
  | { found: false };

export function extractYamlBlock(prBody: string | null): ExtractionResult {
  if (!prBody) return { found: false };

  const startIdx = prBody.indexOf(BLOCK_START);
  if (startIdx === -1) return { found: false };

  const endIdx = prBody.indexOf(BLOCK_END, startIdx);
  if (endIdx === -1) return { found: false };

  const yaml = prBody.slice(startIdx + BLOCK_START.length, endIdx).trim();
  if (!yaml) return { found: false };

  return { found: true, yaml };
}
