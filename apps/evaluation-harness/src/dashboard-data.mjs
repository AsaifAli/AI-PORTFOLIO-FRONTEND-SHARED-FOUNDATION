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


const RUNTIME_METRIC_ALLOWLIST = {
  evidenceflow: [
    "runtime.citation_coverage", "runtime.citation_verification",
    "runtime.grounding_verified", "runtime.grounding_partial",
    "runtime.trust_verified", "runtime.trust_review_required",
    "runtime.security_blocked", "runtime.abstained",
    "runtime.numeric_claims_supported", "runtime.guardrail_finding_count",
    "runtime.guardrail_blocked", "evidence.verified_count",
    "evidence.proposed_count", "retrieval.chunk_count",
    "retrieval.graph_expanded_chunk_count", "retrieval.web_source_count",
  ],
  quotesense: [
    "procurement.document_count", "procurement.quote_count",
    "runtime.extraction_completeness", "runtime.quotation_validation_pass_rate",
    "runtime.scoring_coverage", "runtime.cost_comparability",
    "runtime.comparable_line_item_rate", "runtime.price_reconciliation_coverage",
    "runtime.price_reconciliation_match_rate", "runtime.price_reconciliation_review_rate",
    "runtime.risk_finding_count", "runtime.risked_quotation_rate",
    "runtime.price_anomaly_count", "runtime.analysis_available",
    "runtime.recommendation_available",
  ],
  flowpilot: [
    "runtime.workflow_completion", "runtime.step_coverage",
    "runtime.validation_completed", "runtime.approval_compliance",
    "runtime.approval_pending", "runtime.audit_traceability",
    "runtime.warning_count",
  ],
};

const FRAMEWORK_METRIC_ALLOWLIST = {
  ragas: [
    "faithfulness", "answer_relevancy", "context_precision", "context_recall",
    "context_entity_recall", "noise_sensitivity", "factual_correctness",
    "tool_call_accuracy", "tool_call_f1", "agent_goal_accuracy",
  ],
  deepeval: ["faithfulness", "answer_relevancy", "context_relevancy", "context_precision", "context_recall"],
  trulens: ["groundedness", "context_relevancy", "answer_relevancy"],
  phoenix: ["faithfulness", "context_relevancy", "correctness", "completeness"],
};

const COUNT_METRICS = new Set([
  "evidence.verified_count", "evidence.proposed_count", "retrieval.chunk_count",
  "retrieval.graph_expanded_chunk_count", "retrieval.web_source_count",
  "procurement.document_count", "procurement.quote_count",
  "runtime.guardrail_finding_count", "runtime.risk_finding_count",
  "runtime.price_anomaly_count", "runtime.warning_count",
]);

const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:+/-]{0,63}$/;
const EXPERIMENT_ID_MAX_LENGTH = 256;

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

function safeVersion(value) {
  return typeof value === "string" && VERSION_PATTERN.test(value) ? value : null;
}

function safeExperimentId(value) {
  return typeof value === "string" && value.length > 0 && value.length <= EXPERIMENT_ID_MAX_LENGTH
    ? value
    : null;
}

function allowlistedRuntimeMetrics(project, rawMetrics) {
  const metrics = {};
  const allowed = RUNTIME_METRIC_ALLOWLIST[project] || [];
  for (const key of allowed) {
    const value = rawMetrics[key];
    if (typeof value === "boolean") {
      metrics[key] = value;
    } else {
      const number = finiteNumber(value);
      if (number === null) continue;
      if (COUNT_METRICS.has(key)) {
        if (Number.isInteger(number) && number >= 0 && number <= 1_000_000_000) metrics[key] = number;
      } else if (number >= 0 && number <= 1) {
        metrics[key] = number;
      }
    }
  }
  return metrics;
}

function allowlistedMetricDeltas(project, rawMetrics) {
  const metrics = {};
  const allowedKeys = [
    ...RUNTIME_METRIC_ALLOWLIST[project],
    ...Object.entries(FRAMEWORK_METRIC_ALLOWLIST).flatMap(([framework, names]) =>
      names.map((name) => "external." + framework + "." + name)),
  ];
  for (const key of allowedKeys) {
    const value = finiteNumber(rawMetrics[key]);
    if (value === null) continue;
    if (key.startsWith("external.") || (!COUNT_METRICS.has(key) && RUNTIME_METRIC_ALLOWLIST[project].includes(key))) {
      if (Math.abs(value) <= 1) metrics[key] = value;
    } else if (Math.abs(value) <= 1_000_000_000) {
      metrics[key] = value;
    }
  }
  return metrics;
}

function allowlistedFrameworkMetrics(rawMetrics) {
  const metrics = {};
  for (const [framework, allowedNames] of Object.entries(FRAMEWORK_METRIC_ALLOWLIST)) {
    for (const metricName of allowedNames) {
      const key = "external." + framework + "." + metricName;
      const value = finiteNumber(rawMetrics[key]);
      if (value !== null && value >= 0 && value <= 1) metrics[key] = value;
    }
  }
  return metrics;
}

/** Parse live evaluator events without retaining raw IDs, workflow names or model labels. */
export function parseRuntimeEvaluations(value) {
  if (!isRecord(value) || !Array.isArray(value.results)) return null;

  return value.results
    .filter((row) => isRecord(row) && row.event_type === "evaluation.completed" && PROJECTS.includes(row.project))
    .slice(0, 200)
    .map((row) => {
      const metrics = isRecord(row.metrics) ? row.metrics : {};
      return {
        project: row.project,
        createdAt: safeIsoDate(row.created_at),
        status: ["success", "warning", "failed"].includes(row.status) ? row.status : "success",
        experimentId: safeExperimentId(row.experiment_id),
        datasetVersion: safeVersion(row.dataset_version),
        promptVersion: safeVersion(row.prompt_version),
        modelVersion: safeVersion(row.model_version),
        configVersion: safeVersion(row.config_version),
        frameworkMetrics: allowlistedFrameworkMetrics(metrics),
        runtimeMetrics: allowlistedRuntimeMetrics(row.project, metrics),
      };
    })
    .filter((row) => row.createdAt !== null);
}

/** Parse experiment summaries; identifiers remain opaque values for baseline selection and are never rendered. */
export function parseExperimentComparisons(value) {
  if (!isRecord(value) || !PROJECTS.includes(value.target) || !Array.isArray(value.experiments)) return null;
  const target = value.target;
  const experiments = value.experiments
    .filter(isRecord)
    .slice(0, 100)
    .map((item) => {
      const lineage = isRecord(item.lineage) ? item.lineage : {};
      const rawMetrics = isRecord(item.metrics) ? item.metrics : {};
      const rawDeltas = isRecord(item.metric_deltas) ? item.metric_deltas : {};
      const allAllowed = {
        ...allowlistedFrameworkMetrics(rawMetrics),
        ...allowlistedRuntimeMetrics(target, rawMetrics),
      };
      const allowedDeltas = allowlistedMetricDeltas(target, rawDeltas);
      const score = finiteNumber(item.score);
      const passRate = finiteNumber(item.pass_rate);
      const scoreDelta = finiteNumber(item.score_delta);

      return {
        experimentId: safeExperimentId(item.experiment_id),
        isBaseline: item.is_baseline === true,
        runs: boundedCount(item.runs),
        score: score !== null && score >= 0 && score <= 1 ? score : null,
        passRate: passRate !== null && passRate >= 0 && passRate <= 1 ? passRate : null,
        scoreDelta: scoreDelta !== null && Math.abs(scoreDelta) <= 1 ? scoreDelta : null,
        firstSeen: safeIsoDate(item.first_seen),
        lastSeen: safeIsoDate(item.last_seen),
        lineage: {
          modelVersion: safeVersion(lineage.model_version),
          datasetVersion: safeVersion(lineage.dataset_version),
          promptVersion: safeVersion(lineage.prompt_version),
          configVersion: safeVersion(lineage.config_version),
        },
        metrics: allAllowed,
        metricDeltas: allowedDeltas,
      };
    });
  return {
    target,
    baselineExperimentId: safeExperimentId(value.baseline_experiment_id),
    experiments,
  };
}


/** Return only the metric family selected by the live evaluation source filter. */
export function filterRuntimeMetricSources(row, source) {
  if (!row || typeof row !== "object") return { frameworkMetrics: {}, runtimeMetrics: {} };
  if (source === "all") {
    return {
      frameworkMetrics: { ...(row.frameworkMetrics || {}) },
      runtimeMetrics: { ...(row.runtimeMetrics || {}) },
    };
  }
  if (source === "native") {
    return { frameworkMetrics: {}, runtimeMetrics: { ...(row.runtimeMetrics || {}) } };
  }
  const prefix = "external." + source + ".";
  return {
    frameworkMetrics: Object.fromEntries(
      Object.entries(row.frameworkMetrics || {}).filter(([key]) => key.startsWith(prefix)),
    ),
    runtimeMetrics: {},
  };
}
