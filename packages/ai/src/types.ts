import type { FailureCategory } from '@preview-qa/domain';

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  deployments: {
    planNormalizer: string;
    failureSummarizer: string;
    riskClassifier: string;
    planSuggester: string;
    embeddings: string;
  };
}

export interface PromptCallOptions {
  runId: string;
  promptName: string;
}

export interface PlanNormalizerInput {
  stepType: string;
  rawInstruction: string;
  previewUrl: string;
}

export interface PlanNormalizerOutput {
  selector?: string;
  value?: string;
  url?: string;
  reasoning: string;
}

export interface FailureSummarizerInput {
  stepType: string;
  error: string;
  previewUrl: string;
  pageTitle?: string;
}

export interface FailureSummarizerOutput {
  summary: string;
  suggestedFix?: string;
}

export interface RiskClassifierInput {
  stepType: string;
  error: string;
  failureSummary: string;
}

export interface RiskClassifierOutput {
  category: FailureCategory;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface PlanSuggesterInput {
  changedFiles: string[];
  existingSteps: Array<{ type: string; url?: string; selector?: string; label?: string }>;
  previewUrl: string;
}

export interface PlanSuggestion {
  route: string;
  reason: string;
  stepType: string;
}

export interface PlanSuggesterOutput {
  suggestions: PlanSuggestion[];
}

export interface ModelTraceRow {
  runId: string;
  promptName: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
}
