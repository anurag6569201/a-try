import type { RunMode } from '@preview-qa/domain';
import type { ParsedStep } from '@preview-qa/parser';

export interface PlannerInput {
  runId: string;
  mode: RunMode;
  previewUrl: string;
  parsedSteps: ParsedStep[] | null;
  rawYaml: string | null;
  useAiNormalization?: boolean;
  maxTestCases?: number;
  changedFiles?: string[];
}

export interface ResolvedTestCase {
  name: string;
  steps: ParsedStep[];
  order: number;
}

export interface PlannerOutput {
  planId: string;
  testCases: ResolvedTestCase[];
}
