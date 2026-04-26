export type Severity = 'error' | 'warning' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type ReviewScore = 'lgtm' | 'minor' | 'major' | 'block';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type AgentName =
  | 'security'
  | 'logic'
  | 'type_safety'
  | 'performance'
  | 'test_coverage'
  | 'architecture'
  | 'documentation';

export interface Finding {
  agent: AgentName;
  severity: Severity;
  file: string | undefined;
  line: number | undefined;
  title: string;
  body: string;
  suggestion: string | undefined;
  confidence: Confidence;
  /** CWE identifier for security findings, e.g. "CWE-89" */
  cwe: string | undefined;
}

export interface FileWalkthrough {
  file: string;
  summary: string;
}

export interface ReviewOutput {
  score: ReviewScore;
  riskLevel: RiskLevel;
  executiveSummary: string;
  walkthrough: FileWalkthrough[];
  findings: Finding[];
  stats: {
    errors: number;
    warnings: number;
    info: number;
    agentsRun: number;
    totalFindingsBeforeDedup: number;
    durationMs: number;
  };
}

export interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  patch: string | undefined;
}

export interface ReviewContext {
  prTitle: string;
  prBody: string;
  diff: string;
  changedFiles: ChangedFile[];
  /** Map of filename → full file content (for changed files + key neighbors) */
  fileContents: Map<string, string>;
  /** Serialised knowledge graph excerpt */
  knowledgeGraph: KnowledgeGraphSummary;
  /** Language/framework hints derived from file extensions + package.json */
  techHints: string[];
}

export interface KnowledgeGraphSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type';
  file: string;
  line: number;
  exported: boolean;
}

export interface KnowledgeGraphEdge {
  from: string; // "file:symbolName"
  to: string;
  kind: 'calls' | 'imports' | 'extends' | 'implements';
}

export interface KnowledgeGraphSummary {
  symbols: KnowledgeGraphSymbol[];
  edges: KnowledgeGraphEdge[];
}

/** Raw output that each agent returns before the Synthesizer pass */
export interface AgentResult {
  agent: AgentName;
  findings: Finding[];
  ok: boolean;
  errorMessage?: string;
}

/** A finding enriched with history context from pgvector */
export interface GroundedFinding extends Finding {
  suppressedByHistory: boolean;
  historyNote: string | undefined;
}
