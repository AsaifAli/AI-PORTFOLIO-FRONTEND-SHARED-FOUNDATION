import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Panel, StatusChip } from "@portfolio/ui";
import { loadDashboardSnapshot, loadExperimentComparison, type DashboardSnapshot } from "./api";
import type { EvaluationMetricValue, EvaluationProjectSlug, ExperimentComparison, RuntimeEvaluation } from "./dashboard-data.mjs";
import "@portfolio/ui/styles.css";
import { initializeSharedAppTheme } from "@portfolio/ui/theme";
import "./styles.css";

initializeSharedAppTheme();

const API_BASE_URL = "/api/workspace/apps/evaluation-harness";
const REFRESH_MS = 30_000;

const metricLabels: Record<string, string> = {
  "recall@5": "Recall @ 5",
  "ndcg@5": "NDCG @ 5",
  mrr: "MRR",
  "map@5": "MAP @ 5",
  citation_completeness: "Citation completeness",
  citation_correctness: "Citation correctness",
  answer_relevance: "Answer relevance",
  groundedness: "Groundedness",
  field_exact_match: "Field exact match",
  critical_field_accuracy: "Critical field accuracy",
  numeric_accuracy: "Numeric accuracy",
  risk_accuracy: "Risk accuracy",
  risk_f1: "Risk F1",
  schema_validity: "Schema validity",
  recommendation_consistency: "Recommendation consistency",
  workflow_completion: "Workflow completion",
  step_coverage: "Required step coverage",
  approval_compliance: "Approval compliance",
  retry_recovery: "Retry recovery",
  state_integrity: "Execution-state integrity",
  error_classification_accuracy: "Error classification",
  audit_traceability: "Audit traceability",
};

function percent(value: number | undefined): string {
  return value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
}

function duration(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`;
}

function timestamp(value: string | null | undefined): string {
  if (!value) return "No activity recorded";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function ApplicationCard({
  name,
  slug,
  description,
  snapshot,
}: {
  name: string;
  slug: "evidenceflow" | "quotesense" | "flowpilot";
  description: string;
  snapshot: DashboardSnapshot | null;
}) {
  const replay = snapshot?.quality?.targets[slug];
  const activity = snapshot?.activity?.projects[slug];
  const statusTone = !activity || activity.lastStatus === "no activity"
    ? "neutral"
    : activity.lastStatus === "failed"
      ? "bad"
      : activity.lastStatus === "warning"
        ? "warn"
        : "good";

  return (
    <Panel className={`application-card ${slug}`}>
      <div className="application-head">
        <div>
          <span className="application-kicker">
            {slug === "evidenceflow" ? "01 / RESEARCH QUALITY" : slug === "quotesense" ? "02 / PROCUREMENT QUALITY" : "03 / WORKFLOW QUALITY"}
          </span>
          <h2>{name}</h2>
          <p>{description}</p>
        </div>
        {replay ? (
          <StatusChip label={replay.passed ? "Quality gate passed" : "Gate not passed"} tone={replay.passed ? "good" : "bad"}/>
        ) : <StatusChip label="No replay result" tone="neutral"/>}
      </div>

      <div className="application-score-row">
        <div className="score-block">
          <span>Latest replay score</span>
          <strong>{percent(replay?.score)}</strong>
        </div>
        <div className="score-meta">
          <span>{replay?.cases ?? 0} synthetic cases</span>
          <span>{replay?.gateFailureCount ?? 0} gate failures</span>
          <span>Dataset {replay?.datasetVersion ?? "—"}</span>
        </div>
      </div>

      <div className="metric-grid">
        {replay && Object.entries(replay.metrics).map(([key, value]) => (
          <div className="metric-tile" key={key}>
            <span>{metricLabels[key] ?? key}</span>
            <strong>{percent(value)}</strong>
            <div className="metric-track"><i style={{ width: `${Math.round(value * 100)}%` }}/></div>
          </div>
        ))}
        {!replay && <div className="empty-inline">A replay result will appear after the next operator-triggered evaluation.</div>}
      </div>

      <div className="activity-strip">
        <div><span>Recorded runs</span><strong>{activity?.events ?? "—"}</strong></div>
        <div><span>Successful</span><strong>{activity?.successful ?? "—"}</strong></div>
        <div><span>Warnings</span><strong>{activity?.warnings ?? "—"}</strong></div>
        <div><span>Failed</span><strong>{activity?.failed ?? "—"}</strong></div>
        <div><span>Avg. duration</span><strong>{duration(activity?.averageDurationMs)}</strong></div>
      </div>
      <div className="application-foot">
        <StatusChip label={activity?.lastStatus ?? "Activity unavailable"} tone={statusTone}/>
        <span>Last activity: {timestamp(activity?.lastEventAt)}</span>
      </div>
    </Panel>
  );
}


const frameworkLabels: Record<string, string> = {
  ragas: "RAGAS",
  deepeval: "DeepEval",
  trulens: "TruLens",
  phoenix: "Phoenix",
};

const runtimeLabels: Record<string, string> = {
  "runtime.citation_coverage": "Citation coverage",
  "runtime.citation_verification": "Citation verification",
  "runtime.grounding_verified": "Grounding verified",
  "runtime.grounding_partial": "Partial grounding",
  "runtime.trust_verified": "Trust verified",
  "runtime.trust_review_required": "Trust review required",
  "runtime.security_blocked": "Security blocked",
  "runtime.abstained": "Abstained",
  "runtime.numeric_claims_supported": "Numeric claims supported",
  "runtime.guardrail_finding_count": "Guardrail findings",
  "runtime.guardrail_blocked": "Guardrail blocked",
  "evidence.verified_count": "Verified evidence",
  "evidence.proposed_count": "Proposed evidence",
  "retrieval.chunk_count": "Retrieved chunks",
  "retrieval.graph_expanded_chunk_count": "Graph-expanded chunks",
  "retrieval.web_source_count": "Web sources",
  "procurement.document_count": "Documents processed",
  "procurement.quote_count": "Quotations processed",
  "runtime.extraction_completeness": "Extraction completeness",
  "runtime.quotation_validation_pass_rate": "Quotation validation",
  "runtime.scoring_coverage": "Scoring coverage",
  "runtime.cost_comparability": "Cost comparability",
  "runtime.comparable_line_item_rate": "Comparable line items",
  "runtime.price_reconciliation_coverage": "Price reconciliation coverage",
  "runtime.price_reconciliation_match_rate": "Price reconciliation matched",
  "runtime.price_reconciliation_review_rate": "Price reconciliation review",
  "runtime.risk_finding_count": "Risk findings",
  "runtime.risked_quotation_rate": "Quotations with risk",
  "runtime.price_anomaly_count": "Price anomalies",
  "runtime.analysis_available": "Analysis available",
  "runtime.recommendation_available": "Recommendation available",
  "runtime.workflow_completion": "Workflow completion",
  "runtime.step_coverage": "Required-step coverage",
  "runtime.validation_completed": "Validation completed",
  "runtime.approval_compliance": "Approval compliance",
  "runtime.approval_pending": "Approval pending",
  "runtime.audit_traceability": "Audit traceability",
  "runtime.warning_count": "Workflow warnings",
};

const countMetricNames = new Set([
  "evidence.verified_count", "evidence.proposed_count", "retrieval.chunk_count",
  "retrieval.graph_expanded_chunk_count", "retrieval.web_source_count",
  "procurement.document_count", "procurement.quote_count",
  "runtime.guardrail_finding_count", "runtime.risk_finding_count",
  "runtime.price_anomaly_count", "runtime.warning_count",
]);
const binaryMetricNames = new Set([
  "runtime.grounding_verified", "runtime.grounding_partial",
  "runtime.trust_verified", "runtime.trust_review_required",
  "runtime.security_blocked", "runtime.abstained",
  "runtime.numeric_claims_supported", "runtime.guardrail_blocked",
  "runtime.cost_comparability", "runtime.analysis_available",
  "runtime.recommendation_available", "runtime.validation_completed",
  "runtime.approval_pending", "runtime.audit_traceability",
]);

function displayProject(project: EvaluationProjectSlug): string {
  return project === "evidenceflow" ? "EvidenceFlow" : project === "quotesense" ? "QuoteSense" : "FlowPilot";
}

function displayMetric(key: string): string {
  const frameworkMatch = key.match(/^external\.([^.]+)\.(.+)$/);
  if (frameworkMatch) {
    const framework = frameworkLabels[frameworkMatch[1]] || frameworkMatch[1];
    return framework + " · " + frameworkMatch[2].replaceAll("_", " ");
  }
  return runtimeLabels[key] || metricLabels[key] || key.replace(/^(runtime|retrieval|evidence|procurement)\./, "").replaceAll("_", " ");
}

function displayValue(key: string, value: EvaluationMetricValue, external = false): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (external) return percent(value);
  if (countMetricNames.has(key)) return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (binaryMetricNames.has(key)) return value >= 0.5 ? "Yes" : "No";
  if (/(coverage|completeness|rate|accuracy|compliance|verified|completion|precision|recall|relevancy|relevance|grounding|f1|comparability|integrity|supported|traceability)/i.test(key) && value >= 0 && value <= 1) {
    return percent(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function displayDelta(key: string, value: number): string {
  const sign = value > 0 ? "+" : "";
  return countMetricNames.has(key) ? sign + String(value) : sign + (value * 100).toFixed(1) + " pp";
}

function versionParts(value: ExperimentComparison["lineage"]) {
  return [
    ["Model", value.modelVersion],
    ["Dataset", value.datasetVersion],
    ["Prompt", value.promptVersion],
    ["Config", value.configVersion],
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

function MetricPills({ metrics, external = false }: {
  metrics: Record<string, EvaluationMetricValue>;
  external?: boolean;
}) {
  const entries = Object.entries(metrics);
  if (!entries.length) return <span className="metric-empty">{external ? "No external judge score" : "No runtime checks"}</span>;
  return (
    <div className="evaluation-metric-pills">
      {entries.map(([key, value]) => (
        <span className={"evaluation-metric-pill " + (external ? "external" : "native")} key={key}>
          <strong>{displayMetric(key)}</strong><b>{displayValue(key, value, external)}</b>
        </span>
      ))}
    </div>
  );
}

function RuntimeEvaluationPanel({ rows }: { rows: RuntimeEvaluation[] | null }) {
  const [projectFilter, setProjectFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => (rows ?? []).filter((row) => {
    if (projectFilter !== "all" && row.project !== projectFilter) return false;
    const frameworks = Object.keys(row.frameworkMetrics).map((key) => key.split(".")[1]);
    if (sourceFilter === "native" && !Object.keys(row.runtimeMetrics).length) return false;
    if (sourceFilter !== "all" && sourceFilter !== "native" && !frameworks.includes(sourceFilter)) return false;
    const term = search.trim().toLowerCase();
    if (term) {
      const searchable = [
        displayProject(row.project), row.experimentId, row.modelVersion,
        row.datasetVersion, row.promptVersion, row.configVersion,
        ...Object.keys(row.frameworkMetrics), ...Object.keys(row.runtimeMetrics),
      ].join(" ").toLowerCase();
      if (!searchable.includes(term)) return false;
    }
    return true;
  }), [rows, projectFilter, sourceFilter, search]);

  return (
    <Panel className="evaluation-table-panel">
      <div className="evaluation-controls">
        <label><span>Project</span>
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="all">All projects</option>
            <option value="evidenceflow">EvidenceFlow</option>
            <option value="quotesense">QuoteSense</option>
            <option value="flowpilot">FlowPilot</option>
          </select>
        </label>
        <label><span>Evaluator</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)}>
            <option value="all">All sources</option>
            <option value="native">Native runtime checks</option>
            {Object.entries(frameworkLabels).map(([key, name]) => <option value={key} key={key}>{name}</option>)}
          </select>
        </label>
        <label className="evaluation-search"><span>Search lineage or metric</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Model, dataset, prompt, metric…"/>
        </label>
        <span className="evaluation-count">{filtered.length} evaluation event{filtered.length === 1 ? "" : "s"}</span>
      </div>
      <div className="evaluation-table-scroll">
        <table className="evaluation-table">
          <thead><tr><th>Time</th><th>Project</th><th>Experiment / lineage</th><th>Framework scores</th><th>Runtime / domain checks</th></tr></thead>
          <tbody>
            {filtered.length ? filtered.slice(0, 100).map((row, index) => (
              <tr key={row.project + "-" + row.createdAt + "-" + (row.experimentId || index)}>
                <td className="evaluation-time">{timestamp(row.createdAt)}</td>
                <td><strong>{displayProject(row.project)}</strong><div className="evaluation-subtle">{row.status}</div></td>
                <td><div className="evaluation-lineage">
                  {row.experimentId ? <span><b>Experiment</b>{row.experimentId}</span> : null}
                  {[
                    ["Model", row.modelVersion], ["Dataset", row.datasetVersion],
                    ["Prompt", row.promptVersion], ["Config", row.configVersion],
                  ].filter((item): item is [string, string] => Boolean(item[1])).map(([label, value]) => (
                    <span key={label}><b>{label}</b>{value}</span>
                  ))}
                  {!row.experimentId && !row.modelVersion && !row.datasetVersion && !row.promptVersion && !row.configVersion
                    ? <span>Version lineage not supplied</span> : null}
                </div></td>
                <td><MetricPills metrics={row.frameworkMetrics} external/></td>
                <td><MetricPills metrics={row.runtimeMetrics}/></td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="evaluation-empty-row">
                {rows === null ? "Live evaluation data is temporarily unavailable." : "No live evaluations match these filters. Missing scores are not zero scores."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="evaluation-table-note">External evaluator results appear only when a configured framework actually reports a score. Product-generated signals remain separate from framework scores.</p>
    </Panel>
  );
}

function ExperimentComparisonPanel({
  snapshot,
  onBaselineChange,
  loading,
  error,
}: {
  snapshot: DashboardSnapshot | null;
  onBaselineChange: (target: EvaluationProjectSlug, baselineId: string) => void;
  loading: boolean;
  error: string;
}) {
  const [target, setTarget] = useState<EvaluationProjectSlug>("evidenceflow");
  const [baselineOverride, setBaselineOverride] = useState("");
  const comparison = snapshot?.comparisons[target] ?? null;
  const experiments = comparison?.experiments ?? [];
  const baselineId = comparison?.baselineExperimentId ?? "";
  const selectedBaseline = baselineOverride || baselineId;
  const options = experiments.filter((item) => item.experimentId);

  return (
    <Panel className="experiment-panel">
      <div className="experiment-controls">
        <label><span>Project</span>
          <select value={target} onChange={(event) => {
            setTarget(event.target.value as EvaluationProjectSlug);
            setBaselineOverride("");
          }}>
            <option value="evidenceflow">EvidenceFlow</option>
            <option value="quotesense">QuoteSense</option>
            <option value="flowpilot">FlowPilot</option>
          </select>
        </label>
        <label><span>Compare against baseline</span>
          <select value={selectedBaseline} disabled={!options.length || loading} onChange={(event) => {
            setBaselineOverride(event.target.value);
            onBaselineChange(target, event.target.value);
          }}>
            {!options.length ? <option value="">No experiment baseline</option> : null}
            {options.map((item, index) => (
              <option key={item.experimentId!} value={item.experimentId!}>
                {(item.isBaseline ? "Current baseline" : "Experiment " + (index + 1)) + " · " + item.runs + " run(s)"}
              </option>
            ))}
          </select>
        </label>
        <span className="evaluation-count">{experiments.length} experiment group{experiments.length === 1 ? "" : "s"}</span>
      </div>
      {error ? <div className="notice" role="status">{error}</div> : null}
      {loading ? <div className="evaluation-empty">Updating experiment comparison…</div> : null}
      {!loading && !experiments.length ? (
        <div className="evaluation-empty">No experiment history has been recorded for {displayProject(target)} yet. Add experiment IDs or version labels to new evaluations to make comparisons meaningful.</div>
      ) : null}
      {experiments.length ? (
        <div className="experiment-list">
          {experiments.map((item, index) => (
            <article className={"experiment-row " + (item.isBaseline ? "baseline" : "")} key={item.experimentId || target + "-" + index}>
              <div className="experiment-identity">
                <span>{item.isBaseline ? "Baseline" : "Variant " + (index + 1)}</span>
                <strong>{item.runs} run{item.runs === 1 ? "" : "s"}</strong>
                {item.score !== null ? <b>{percent(item.score)}</b> : <small>No composite score</small>}
                {item.scoreDelta !== null ? <small className={item.scoreDelta >= 0 ? "delta-positive" : "delta-negative"}>{displayDelta("overall_score", item.scoreDelta)} vs baseline</small> : null}
              </div>
              <div className="experiment-lineage">
                {versionParts(item.lineage).map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>)}
                {!versionParts(item.lineage).length ? <span>Version lineage not supplied</span> : null}
              </div>
              <div className="experiment-deltas">
                {Object.entries(item.metricDeltas).map(([key, value]) => (
                  <span className={"delta-chip " + (value >= 0 ? "positive" : "negative")} key={key}>
                    <b>{displayMetric(key)}</b>{displayDelta(key, value)}
                  </span>
                ))}
                {!Object.keys(item.metricDeltas).length ? <span className="metric-empty">No shared metric keys against the selected baseline.</span> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <p className="evaluation-table-note">Deltas are directional, not automatic regression verdicts. Lower risk counts may be better; lower coverage, faithfulness or completion is usually worse.</p>
    </Panel>
  );
}

function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState("");

  const refresh = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    const next = await loadDashboardSnapshot(API_BASE_URL, signal);
    if (signal.aborted) return;
    setSnapshot(next);
    setRefreshError(!next.serviceHealthy && !next.quality && !next.activity
      ? "The Evaluation Harness is not responding. Existing application services are unaffected."
      : "");
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const interval = window.setInterval(() => {
      const nextController = new AbortController();
      void refresh(nextController.signal);
      window.setTimeout(() => nextController.abort(), 8_000);
    }, REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refresh]);

  const changeBaseline = useCallback(async (target: EvaluationProjectSlug, baselineId: string) => {
    setComparisonLoading(true);
    setComparisonError("");
    const controller = new AbortController();
    const next = await loadExperimentComparison(API_BASE_URL, target, baselineId || null, controller.signal);
    if (next) {
      setSnapshot((current) => current
        ? { ...current, comparisons: { ...current.comparisons, [target]: next } }
        : current);
    } else {
      setComparisonError("This experiment baseline could not be loaded. The current comparison remains unchanged.");
    }
    setComparisonLoading(false);
  }, []);

  const totalEvents = snapshot?.activity?.totalEvents;
  const targets = snapshot?.quality?.targets;
  const gatePasses = Object.values(targets ?? {}).filter((target) => target.passed).length;
  const targetCount = Object.keys(targets ?? {}).length;
  const updatedAt = snapshot?.checkedAt ? timestamp(snapshot.checkedAt) : "Waiting for first refresh";

  return (
    <div className="app evaluation-app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">EA</div>
          <div className="brand-copy"><strong>Engineering Assurance</strong><span>AI Engineering Studio · read-only</span></div>
        </div>
        <div className="top-actions">
          <StatusChip label={snapshot?.serviceHealthy ? "Harness online" : "Checking service"} tone={snapshot?.serviceHealthy ? "good" : "warn"}/>
          <button className="btn ghost" type="button" onClick={() => {
            const controller = new AbortController();
            void refresh(controller.signal);
            window.setTimeout(() => controller.abort(), 8_000);
          }} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>
      </header>

      <main className="shell">
        <section className="hero">
          <div>
            <span className="eyebrow">Engineering assurance / internal evaluation</span>
            <h1>Evidence behind the AI systems.</h1>
            <p>Inspect deterministic replay quality and content-free application activity without starting model runs or accessing provider credentials.</p>
            <div className="hero-status"><span className={`service-dot ${snapshot?.serviceHealthy ? "good" : ""}`}/><span>{snapshot?.serviceHealthy ? "Connected to the existing Evaluation Harness API" : "Waiting for Harness health"}</span><span>·</span><span>{updatedAt}</span></div>
          </div>
          <aside className="hero-note"><strong>Read-only by design</strong><span>This interface only calls public GET endpoints. Replay execution, telemetry ingestion and application workflow actions remain outside this UI.</span></aside>
        </section>

        {refreshError && <div className="notice" role="alert">{refreshError}</div>}

        <section className="kpis" aria-label="Combined evaluation summary">
          <div className="kpi"><span>Recorded events</span><strong>{totalEvents ?? "—"}</strong><small>Content-free activity from connected apps</small></div>
          <div className="kpi"><span>Quality gates passed</span><strong>{targetCount ? `${gatePasses}/${targetCount}` : "—"}</strong><small>Latest replay evaluation results</small></div>
          <div className="kpi"><span>Live evaluation events</span><strong>{snapshot?.runtime ? snapshot.runtime.length : "—"}</strong><small>Separate from normal application activity</small></div>
          <div className="kpi"><span>External framework scores</span><strong>{snapshot?.runtime ? snapshot.runtime.reduce((total, row) => total + Object.keys(row.frameworkMetrics).length, 0) : "—"}</strong><small>Only evaluators that actually reported scores</small></div>
        </section>

        <section className="section-heading"><div><span>01 / PROJECT QUALITY</span><h2>Application evidence</h2></div><small>Replay scores are synthetic fixture results, not production-user outcomes.</small></section>
        <div className="application-grid">
          <ApplicationCard name="EvidenceFlow" slug="evidenceflow" description="Sparse-first retrieval, evidence provenance and citation verification." snapshot={snapshot}/>
          <ApplicationCard name="QuoteSense" slug="quotesense" description="Structured quotation extraction, deterministic scoring and procurement validation." snapshot={snapshot}/>
          <ApplicationCard name="FlowPilot" slug="flowpilot" description="Workflow completion, human-approval compliance, retry recovery and execution-state integrity." snapshot={snapshot}/>
        </div>


        <section className="section-heading"><div><span>02 / LIVE EVALUATION</span><h2>Scores and operational checks</h2></div><small>Framework judges and native project checks are intentionally separate.</small></section>
        <RuntimeEvaluationPanel rows={snapshot?.runtime ?? null}/>

        <section className="section-heading"><div><span>03 / EXPERIMENT LINEAGE</span><h2>Compare versions and baselines</h2></div><small>Run counts, model/dataset/prompt/config labels and per-metric movement.</small></section>
        <ExperimentComparisonPanel
          snapshot={snapshot}
          onBaselineChange={changeBaseline}
          loading={comparisonLoading}
          error={comparisonError}
        />

        <section className="section-heading"><div><span>04 / FRAMEWORK COVERAGE</span><h2>Connected versus importable</h2></div></section>
        <div className="framework-coverage-grid">
          <article><span className="framework-status connected">Core metrics</span><h3>Deterministic checks</h3><p>Replay fixtures and project-emitted retrieval, procurement and workflow signals.</p></article>
          <article><span className="framework-status optional">Opt-in runtime</span><h3>RAGAS</h3><p>EvidenceFlow can report faithfulness and context precision when explicitly enabled. It is disabled by default.</p></article>
          <article><span className="framework-status adapter">Score import</span><h3>DeepEval</h3><p>Supported through the harness score-import adapter; not a default live runtime emitter.</p></article>
          <article><span className="framework-status adapter">Score import</span><h3>TruLens</h3><p>Normalized scores can be imported. It is not a connected live runtime evaluator.</p></article>
          <article><span className="framework-status adapter">Score import</span><h3>Phoenix</h3><p>Normalized scores can be imported. It is not a connected live runtime evaluator.</p></article>
        </div>
        <section className="privacy-panel">
          <div><span>05 / DATA BOUNDARY</span><h2>Signals, not customer content.</h2></div>
          <p>The Harness dashboard displays allowlisted scalar metrics, version labels and aggregate activity counts. Prompts, generated drafts, uploaded documents, supplier details, source excerpts, model responses, event identifiers and provider credentials are not rendered here. An absent score is not treated as zero.</p>
        </section>
        <footer className="footer"><span>AI Engineering Studio · Engineering Assurance</span><span>Read-only API · no provider key required</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
