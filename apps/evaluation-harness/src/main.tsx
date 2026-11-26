import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Panel, StatusChip } from "@portfolio/ui";
import { loadDashboardSnapshot, type DashboardSnapshot } from "./api";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
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
  slug: "evidenceflow" | "quotesense";
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
          <span className="application-kicker">{slug === "evidenceflow" ? "01 / RESEARCH QUALITY" : "02 / PROCUREMENT QUALITY"}</span>
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

function App() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");

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
          <div className="kpi"><span>Connected projects</span><strong>{snapshot?.activity ? 2 : "—"}</strong><small>EvidenceFlow and QuoteSense</small></div>
          <div className="kpi"><span>Refresh cadence</span><strong>30s</strong><small>{loading ? "Updating snapshot" : "Automatic refresh enabled"}</small></div>
        </section>

        <section className="section-heading"><div><span>01 / PROJECT QUALITY</span><h2>Application evidence</h2></div><small>Replay scores are synthetic fixture results, not production-user outcomes.</small></section>
        <div className="application-grid">
          <ApplicationCard name="EvidenceFlow" slug="evidenceflow" description="Sparse-first retrieval, evidence provenance and citation verification." snapshot={snapshot}/>
          <ApplicationCard name="QuoteSense" slug="quotesense" description="Structured quotation extraction, deterministic scoring and procurement validation." snapshot={snapshot}/>
        </div>

        <section className="privacy-panel">
          <div><span>02 / DATA BOUNDARY</span><h2>Signals, not customer content.</h2></div>
          <p>The Harness dashboard displays allowlisted scores and aggregate event counts. Prompts, uploaded documents, supplier details, source excerpts, model responses, event identifiers and provider credentials are not rendered here.</p>
        </section>
        <footer className="footer"><span>AI Engineering Studio · Engineering Assurance</span><span>Read-only API · no provider key required</span></footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
