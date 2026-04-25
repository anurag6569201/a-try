export interface CorrelationContext {
  runId?: string;
  installationId?: string;
  repositoryId?: string;
  sha?: string;
  correlationId?: string;
}
