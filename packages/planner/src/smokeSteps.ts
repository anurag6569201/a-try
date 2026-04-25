import { StepType } from '@preview-qa/domain';
import type { ParsedStep } from '@preview-qa/parser';

export function buildSmokeSteps(previewUrl: string): ParsedStep[] {
  return [
    { type: StepType.Navigate, url: previewUrl },
    { type: StepType.Assert200, url: previewUrl },
    { type: StepType.Screenshot, label: 'home' },
  ] as ParsedStep[];
}
