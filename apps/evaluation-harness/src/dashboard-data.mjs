const PROJECTS = ["evidenceflow", "quotesense", "flowpilot"];

const METRIC_ALLOWLIST = {
  evidenceflow: [
    "recall@5",
    "ndcg@5",
    "mrr",
    "map@5",
    "citation_completeness",
    "citation_correctness",
    "answer_relevance",
    "groundedness",
  ],
  quotesense: [
    "field_exact_match",
    "critical_field_accuracy",
    "numeric_accuracy",
    "risk_accuracy",
    "risk_f1",
    "schema_validity",
    "recommendation_consistency",
  ],
  flowpilot: [
    "workflow_completion",
    "step_coverage",
    "approval_compliance",
    "retry_recovery",
    "state_integrity",
    "error_classification_accuracy",
    "audit_traceability",
  ],
};

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boundedCount(value) {
  const number = finiteNumber(value);
  return number === null ? 0 : Math.max(0, Math.min(1_000_000_000, Math.floor(number)));
}

function safeIsoDate(value) {
  if (typeof value !== "string" || value.length > 64) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function latestDateForTarget(runs, target) {
  if (!Array.isArray(runs)) return null;
  const dates = runs
    .filter((run) => isRecord(run) && run.target === target)
    .map((run) => safeIsoDate(run.created_at))
    .filter((date) => date !== null);
  return dates.sort().at(-1) ?? null;
}

/** Whitelist replay scores and metrics for the three public studio applications. */
export function parseQuality(value) {
  if (!isRecord(value) || !isRecord(value.targets)) return null;
  const targets = {};

  for (const slug of PROJECTS) {
    const source = value.targets[slug];
    if (!isRecord(source)) continue;
    const score = finiteNumber(source.score);
    if (score === null || score < 0 || score > 1 || typeof source.passed !== "boolean") continue;

    const rawMetrics = isRecord(source.metrics) ? source.metrics : {};
    const metrics = {};
    for (const key of METRIC_ALLOWLIST[slug]) {
      const metric = finiteNumber(rawMetrics[key]);
      if (metric !== null && metric >= 0 && metric <= 1) metrics[key] = metric;
    }

    const lineage = isRecord(source.lineage) ? source.lineage : {};
    const datasetVersion = typeof lineage.dataset_version === "string" && lineage.dataset_version.length <= 40
      ? lineage.dataset_version
      : null;
    const gateFailures = Array.isArray(source.gate_failures) ? source.gate_failures : [];

    targets[slug] = {
      score,
      passed: source.passed,
      cases: boundedCount(source.cases),
      gateFailureCount: Math.min(gateFailures.length, 100),
      datasetVersion,
      latestReplayAt: latestDateForTarget(value.runs, slug),
      metrics,
    };
  }

  return Object.keys(targets).length > 0 ? { targets } : null;
}

function parseProjectSummary(value) {
  if (!isRecord(value)) return null;
  const allowedStatuses = new Set(["success", "warning", "failed", "no activity"]);
  const lastStatus = typeof value.last_status === "string" && allowedStatuses.has(value.last_status)
    ? value.last_status
    : "no activity";
  const duration = finiteNumber(value.average_duration_ms);

  return {
    events: boundedCount(value.events),
    successful: boundedCount(value.successful),
    warnings: boundedCount(value.warnings),
    failed: boundedCount(value.failed),
    averageDurationMs: duration !== null && duration >= 0 && duration <= 900_000 ? duration : null,
    lastEventAt: safeIsoDate(value.last_event_at),
    lastStatus,
  };
}

/** Return aggregate counts only; event rows and user content never reach the UI. */
export function parseActivity(value) {
  if (!isRecord(value) || !isRecord(value.projects)) return null;
  const evidenceflow = parseProjectSummary(value.projects.evidenceflow);
  const quotesense = parseProjectSummary(value.projects.quotesense);
  const flowpilot = parseProjectSummary(value.projects.flowpilot);
  if (!evidenceflow || !quotesense || !flowpilot) return null;
  return {
    totalEvents: boundedCount(value.total_events),
    projects: { evidenceflow, quotesense, flowpilot },
  };
}
