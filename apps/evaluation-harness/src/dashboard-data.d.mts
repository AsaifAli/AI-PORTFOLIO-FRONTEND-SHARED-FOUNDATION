export type EvaluationProjectSlug = "evidenceflow" | "quotesense" | "flowpilot";
export type EvaluationMetricValue = number | boolean;

export type ReplayTarget = {
  score: number;
  passed: boolean;
  cases: number;
  gateFailureCount: number;
  datasetVersion: string | null;
  latestReplayAt: string | null;
  metrics: Record<string, number>;
};

export type QualitySnapshot = {
  targets: Partial<Record<EvaluationProjectSlug, ReplayTarget>>;
};

export type ProjectActivity = {
  events: number;
  successful: number;
  warnings: number;
  failed: number;
  averageDurationMs: number | null;
  lastEventAt: string | null;
  lastStatus: "success" | "warning" | "failed" | "no activity";
};

export type ActivitySnapshot = {
  totalEvents: number;
  projects: Record<EvaluationProjectSlug, ProjectActivity>;
};

export type RuntimeEvaluation = {
  project: EvaluationProjectSlug;
  createdAt: string;
  status: "success" | "warning" | "failed";
  experimentId: string | null;
  datasetVersion: string | null;
  promptVersion: string | null;
  modelVersion: string | null;
  configVersion: string | null;
  frameworkMetrics: Record<string, number>;
  runtimeMetrics: Record<string, EvaluationMetricValue>;
};

export type ExperimentComparison = {
  experimentId: string | null;
  isBaseline: boolean;
  runs: number;
  score: number | null;
  passRate: number | null;
  scoreDelta: number | null;
  firstSeen: string | null;
  lastSeen: string | null;
  lineage: {
    modelVersion: string | null;
    datasetVersion: string | null;
    promptVersion: string | null;
    configVersion: string | null;
  };
  metrics: Record<string, EvaluationMetricValue>;
  metricDeltas: Record<string, number>;
};

export type ExperimentComparisonSnapshot = {
  target: EvaluationProjectSlug;
  baselineExperimentId: string | null;
  experiments: ExperimentComparison[];
};

export function parseQuality(value: unknown): QualitySnapshot | null;
export function parseActivity(value: unknown): ActivitySnapshot | null;
export function parseRuntimeEvaluations(value: unknown): RuntimeEvaluation[] | null;
export function parseExperimentComparisons(value: unknown): ExperimentComparisonSnapshot | null;
