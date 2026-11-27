export type EvaluationProjectSlug = "evidenceflow" | "quotesense" | "flowpilot";

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

export function parseQuality(value: unknown): QualitySnapshot | null;
export function parseActivity(value: unknown): ActivitySnapshot | null;
