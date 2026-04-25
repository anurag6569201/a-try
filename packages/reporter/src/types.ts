import type { StepResult } from '@preview-qa/runner-playwright';
import type { ArtifactKind, FailureCategory } from '@preview-qa/domain';

export interface ReportArtifact {
  kind: ArtifactKind;
  blobUrl: string;
  filename: string;
}

export interface RunReport {
  runId: string;
  outcome: 'pass' | 'fail';
  durationMs: number;
  previewUrl?: string;
  sha: string;
  steps: StepResult[];
  artifacts: ReportArtifact[];
  failureCategory?: FailureCategory;
  timedOut?: boolean;
}
