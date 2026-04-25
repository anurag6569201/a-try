import { StepType } from '@preview-qa/domain';
import type { AzureOpenAIConfig } from '@preview-qa/ai';
import { createAzureOpenAIClient, runPlanNormalizer } from '@preview-qa/ai';
import type { ParsedStep } from '@preview-qa/parser';
import type { Pool } from 'pg';
import { sanitizeForLlm } from './sanitize.js';

// Steps that benefit from AI selector normalization
const NORMALIZABLE_TYPES = new Set<StepType>([
  StepType.Fill,
  StepType.Click,
  StepType.AssertVisible,
  StepType.AssertNotVisible,
]);

export async function normalizeSteps(
  pool: Pool,
  aiConfig: AzureOpenAIConfig,
  runId: string,
  steps: ParsedStep[],
  previewUrl: string,
): Promise<ParsedStep[]> {
  const client = createAzureOpenAIClient(aiConfig);

  return Promise.all(
    steps.map(async (step, i): Promise<ParsedStep> => {
      if (!NORMALIZABLE_TYPES.has(step.type)) return step;

      // Only normalize steps that use a raw natural-language description as selector
      const selector = 'selector' in step ? step.selector : undefined;
      if (!selector || isLikelyCssOrAria(selector)) return step;

      try {
        const result = await runPlanNormalizer(
          client,
          pool,
          aiConfig.deployments.planNormalizer,
          {
            stepType: step.type,
            rawInstruction: sanitizeForLlm(selector),
            previewUrl,
          },
          { runId, promptName: `plan_normalizer_step_${i}` },
        );

        if (result.selector) {
          return { ...step, selector: result.selector } as ParsedStep;
        }
      } catch (err) {
        console.warn(`[${runId}] AI normalization failed for step ${i}:`, err);
      }

      return step;
    }),
  );
}

// Heuristic: if it looks like CSS or aria-*, skip AI normalization
function isLikelyCssOrAria(selector: string): boolean {
  return (
    selector.startsWith('#') ||
    selector.startsWith('.') ||
    selector.startsWith('[') ||
    selector.startsWith('button') ||
    selector.startsWith('input') ||
    selector.startsWith('a[') ||
    selector.includes('>>') ||
    selector.startsWith('aria/')
  );
}
