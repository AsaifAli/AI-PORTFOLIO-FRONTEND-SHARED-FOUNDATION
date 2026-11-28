const COUNT_METRICS = new Set([
  "evidence.verified_count", "evidence.proposed_count", "retrieval.chunk_count",
  "retrieval.graph_expanded_chunk_count", "retrieval.web_source_count",
  "procurement.document_count", "procurement.quote_count",
  "runtime.guardrail_finding_count", "runtime.risk_finding_count",
  "runtime.price_anomaly_count", "runtime.warning_count",
]);

const BINARY_METRICS = new Set([
  "runtime.grounding_verified", "runtime.grounding_partial",
  "runtime.trust_verified", "runtime.trust_review_required",
  "runtime.security_blocked", "runtime.abstained",
  "runtime.numeric_claims_supported", "runtime.guardrail_blocked",
  "runtime.cost_comparability", "runtime.analysis_available",
  "runtime.recommendation_available", "runtime.validation_completed",
  "runtime.approval_pending", "runtime.audit_traceability",
]);

const RATIO_HINTS = /coverage|completeness|rate|accuracy|compliance|verified|verification|completion|precision|recall|relevancy|relevance|grounding|f1|comparability|integrity|supported|traceability/i;

export function formatMetricValue(key, value, external = false) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (!Number.isFinite(value)) return "—";
  if (external) return (value * 100).toFixed(1) + "%";
  if (COUNT_METRICS.has(key)) return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (BINARY_METRICS.has(key)) return value >= 0.5 ? "Yes" : "No";
  if (RATIO_HINTS.test(key) && value >= 0 && value <= 1) return (value * 100).toFixed(1) + "%";
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatMetricDelta(key, value) {
  if (!Number.isFinite(value)) return String(value);
  const sign = value > 0 ? "+" : "";
  if (COUNT_METRICS.has(key)) return sign + String(value);
  if (BINARY_METRICS.has(key)) {
    return value > 0 ? "No → Yes" : value < 0 ? "Yes → No" : "No change";
  }
  return sign + (value * 100).toFixed(1) + " pp";
}
