import { StepType } from '@preview-qa/domain';

export interface Step {
  type: StepType;
  selector?: string;
  value?: string;
  url?: string;
  label?: string;
}

export interface StepResult {
  type: StepType;
  ok: boolean;
  durationMs: number;
  error?: string;
  screenshotPath?: string;
}

export interface RunnerResult {
  outcome: 'pass' | 'fail';
  steps: StepResult[];
  durationMs: number;
  tracePath?: string;
  errorScreenshotPath?: string;
}

export interface RunnerInput {
  previewUrl: string;
  steps: Step[];
  outputDir: string;
  timeoutMs?: number;
  storageStatePath?: string;
}
