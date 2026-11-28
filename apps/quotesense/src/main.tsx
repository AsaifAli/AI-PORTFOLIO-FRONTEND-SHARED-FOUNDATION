import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient, type ApiStreamEvent } from "@portfolio/api-client";
import { bootstrapSession, revokeSession, type SessionMetadata } from "@portfolio/session";
import { AppHeader, Button, EmptyState, Field, MetricCard, Notice, PageHeader, Panel, SectionLabel, StatusChip } from "@portfolio/ui";
import {
  createSampleProcessingTrace,
  createSampleQuoteAnalysis,
  DEFAULT_SCORING_WEIGHTS,
  getAnalysisView,
  latestStageEvent,
  mergeQuoteUploads,
  QUOTESENSE_PROCESSING_STAGES,
  scoreNumber,
  toComparisonCsv,
  toSupplierCsv,
  validateQuoteUploads,
  type ProcessingStageEvent,
  type QuoteAnalysis,
} from "./data";
import { ProcurementComparison } from "./ProcurementComparison";
import "@portfolio/ui/styles.css";
import { initializeSharedAppTheme } from "@portfolio/ui/theme";
import "./styles.css";

initializeSharedAppTheme();

type SessionView = SessionMetadata & { error?: string };
const api = createApiClient("/api/workspace/apps/quotesense");
const CRITERIA = ["cost", "completeness", "timeline", "terms", "risk"] as const;

function displayCost(value: unknown, currency: unknown) {
  if (value === null || value === undefined || value === "") return "Not provided";
  const amount = String(value);
  return currency ? `${String(currency)} ${amount}` : amount;
}

function downloadFile(name: string, type: string, contents: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  URL.revokeObjectURL(url);
}

function SupplierComparison({ result }: { result: QuoteAnalysis }) {
  const view = getAnalysisView(result);
  const quoteBySupplier = new Map(view.quotations.map((quote) => [String(quote.supplier || quote.vendor || "Unknown supplier").toLowerCase(), quote]));
  if (!view.scores.length && !view.quotations.length) return <EmptyState title="No supplier comparison returned" body="The API did not return validated quotation or scoring records for this analysis."/>;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Rank</th><th>Supplier</th><th>Score</th><th>Quoted cost</th><th>Timeline</th><th>Price check</th></tr></thead><tbody>{(view.scores.length ? view.scores : view.quotations).map((score, index) => {
    const supplier = String(score.supplier || score.vendor || "Unknown supplier");
    const quote = quoteBySupplier.get(supplier.toLowerCase()) ?? score;
    const numeric = scoreNumber(score.score);
    return <tr key={`${supplier}-${index}`}><td>{index + 1}</td><td><strong>{supplier}</strong></td><td>{numeric === null ? "Not scored" : <><strong>{numeric.toFixed(1)}</strong><small className="table-muted"> / 100</small></>}</td><td>{displayCost(quote.total_cost, quote.currency)}</td><td>{String(quote.delivery_timeline || "—")}</td><td>{score.cost_comparable === false ? <StatusChip label="Not comparable" tone="warn"/> : <StatusChip label="Comparable" tone="good"/>}</td></tr>;
  })}</tbody></table></div>;
}


function formatStageMetrics(event: ProcessingStageEvent | null): string {
  if (!event?.metrics) return "";
  const metric = (key: string) => {
    const value = event.metrics?.[key];
    return typeof value === "number" ? value : null;
  };
  const parts: string[] = [];
  if (event.stage === "ingest") {
    const count = metric("document_count");
    const bytes = metric("total_bytes");
    if (count !== null) parts.push(`${count} documents`);
    if (bytes !== null) parts.push(`${(bytes / (1024 * 1024)).toFixed(1)} MB received`);
  } else if (event.stage === "extract") {
    const index = metric("document_index");
    const total = metric("document_count");
    const quotes = metric("quotation_count");
    const fields = metric("extracted_field_count");
    const duration = metric("duration_ms");
    if (index !== null && total !== null) parts.push(`Document ${index} of ${total}`);
    if (quotes !== null) parts.push(`${quotes} quotations`);
    if (fields !== null) parts.push(`${fields} fields`);
    if (duration !== null) parts.push(`${(duration / 1000).toFixed(1)}s`);
  } else if (event.stage === "validation") {
    const count = metric("quotation_count");
    const missing = metric("missing_field_count");
    if (count !== null) parts.push(`${count} quotations checked`);
    if (missing !== null) parts.push(`${missing} missing fields`);
  } else if (event.stage === "scoring") {
    const count = metric("scored_supplier_count");
    if (count !== null) parts.push(`${count} suppliers scored`);
  } else if (event.stage === "risk_assessment") {
    const risks = metric("risk_finding_count");
    const anomalies = metric("price_anomaly_count");
    if (risks !== null) parts.push(`${risks} risk findings`);
    if (anomalies !== null) parts.push(`${anomalies} price anomalies`);
  } else if (event.stage === "complete") {
    const quotes = metric("quotation_count");
    const risks = metric("risk_finding_count");
    if (quotes !== null) parts.push(`${quotes} quotations`);
    if (risks !== null) parts.push(`${risks} risk findings`);
  }
  return parts.join(" · ");
}

function ProcessingJourney({
  events,
  busy,
  example,
}: {
  events: ProcessingStageEvent[];
  busy: boolean;
  example: boolean;
}) {
  return (
    <Panel
      className="processing-journey"
      title="Processing journey"
      detail={example
        ? "A guided walkthrough using synthetic supplier quotations. No files were uploaded and no model calls were made."
        : busy
          ? "Live stages reported by the QuoteSense API. No artificial progress is added."
          : "The stages and counts below were reported by the completed QuoteSense run."}
      actions={<StatusChip label={example ? "Synthetic example" : busy ? "Live analysis" : "Run trace"} tone={example ? "neutral" : busy ? "warn" : "good"}/>}
    >
      <ol className="journey-list" aria-live={busy ? "polite" : "off"}>
        {QUOTESENSE_PROCESSING_STAGES.map((stage, index) => {
          const event = latestStageEvent(events, stage.id);
          const status = example ? "example" : event?.status || "pending";
          const statusLabel = status === "example" ? "Example"
            : status === "started" ? "In progress"
              : status === "completed" ? "Complete"
                : status === "failed" ? "Failed" : "Awaiting";
          const tone = status === "completed" ? "good"
            : status === "started" ? "warn"
              : status === "failed" ? "bad" : "neutral";
          const message = example
            ? event?.message || stage.description
            : event?.message || (busy ? "Waiting for the backend to report this stage." : "Not emitted in this run.");
          const metrics = formatStageMetrics(event);
          return (
            <li className={`journey-step journey-${status}`} key={stage.id}>
              <span className="journey-step-marker" aria-hidden="true">
                {status === "completed" && !example ? "✓" : String(index + 1).padStart(2, "0")}
              </span>
              <div className="journey-step-content">
                <div className="journey-step-head">
                  <div><strong>{stage.label}</strong><small>{stage.description}</small></div>
                  <StatusChip label={statusLabel} tone={tone}/>
                </div>
                <p>{message}</p>
                {metrics ? <small className="journey-step-metrics">{metrics}</small> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="journey-footnote">
        {example
          ? "Sample figures are illustrative and are not procurement advice."
          : "The model extracts and explains; Python validates and scores; a person makes the procurement decision."}
      </div>
    </Panel>
  );
}

function App() {
  const [session, setSession] = useState<SessionView>({ active: false });
  const [sessionLoading, setSessionLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("Compare these supplier quotations and identify commercial risks, missing terms, and the strongest evidence-backed option.");
  const [criteria, setCriteria] = useState<string[]>([...CRITERIA]);
  const [scoringWeights, setScoringWeights] = useState<Record<string, number>>({ ...DEFAULT_SCORING_WEIGHTS });
  const [result, setResult] = useState<QuoteAnalysis | null>(null);
  const [tab, setTab] = useState<"summary" | "suppliers" | "evidence">("summary");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");
  const [processingEvents, setProcessingEvents] = useState<ProcessingStageEvent[]>([]);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const status = await bootstrapSession({
        exchangePath: "/api/workspace/apps/quotesense/session/exchange",
        sessionPath: "/api/workspace/apps/quotesense/session",
      });
      if (!alive) return;
      setSession(status); setSessionLoading(false);
      if (status.active) {
        try {
          await api.get("/health");
          if (alive) setHealth("online");
        } catch { if (alive) setHealth("offline"); }
      } else setHealth("offline");
    })();
    return () => { alive = false; };
  }, []);

  const view = useMemo(() => result ? getAnalysisView(result) : null, [result]);
  const riskHighCount = view?.risks.filter((risk) => String(risk.severity || "").toLowerCase() === "high" || String(risk.level || "").toLowerCase() === "high" || risk.critical === true).length ?? 0;
  const completenessTone = view?.averageCompleteness === null || view?.averageCompleteness === undefined ? "neutral" : view.averageCompleteness >= 85 ? "good" : view.averageCompleteness >= 70 ? "warn" : "bad";

  function updateFiles(incoming: FileList | null) {
    if (!incoming?.length) return;
    const unique = mergeQuoteUploads(files, Array.from(incoming));
    const validation = validateQuoteUploads(unique);
    if (validation) { setError(validation); return; }
    setError(""); setFiles(unique); setResult(null); setProcessingEvents([]); setDemoMode(false);
  }

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!session.active || busy) return;
    if (!files.length) { setError("Add at least one supplier quotation before starting the analysis."); return; }
    if (!criteria.length) { setError("Select at least one qualitative review focus."); return; }
    if (!Object.values(scoringWeights).some((weight) => Number.isFinite(weight) && weight > 0)) {
      setError("At least one deterministic scoring weight must be greater than zero.");
      return;
    }
    setBusy(true); setError(""); setNotice(""); setResult(null); setProcessingEvents([]); setDemoMode(false);
    const form = new FormData();
    files.forEach((file) => form.append("files", file, file.name));
    form.append("query", query);
    form.append("criteria", criteria.join(","));
    form.append("weights", JSON.stringify(scoringWeights));
    try {
      const response = await api.stream<QuoteAnalysis>(
        "/api/v1/analyses/stream",
        form,
        (event: ApiStreamEvent) => {
          if (event.event !== "stage" || typeof event.data !== "object" || event.data === null) return;
          const stage = event.data as ProcessingStageEvent;
          if (typeof stage.stage === "string" && ["started", "completed", "failed"].includes(stage.status)) {
            setProcessingEvents((current) => [...current, stage]);
          }
        },
        AbortSignal.timeout(180_000),
      );
      setResult(response); setTab("summary"); setNotice("Analysis completed. Inspect the processing trace, deterministic score and qualitative recommendation separately.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Quotation analysis failed. Check the API and retry."); }
    finally { setBusy(false); }
  }

  function showSampleWalkthrough() {
    setError("");
    setNotice("");
    setBusy(false);
    setResult(createSampleQuoteAnalysis());
    setProcessingEvents(createSampleProcessingTrace());
    setDemoMode(true);
    setTab("summary");
  }

  async function endSession() {
    try { await revokeSession("/api/workspace/apps/quotesense/session/revoke"); setSession({ active: false }); setHealth("offline"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not end the secure session."); }
  }

  const topScore = view?.bestScore;
  const primary = view?.primaryRecommendation;
  const scoreComponents = [
    ["Cost", view?.deterministicLeader?.cost_score],
    ["Completeness", view?.deterministicLeader?.completeness_score],
    ["Timeline", view?.deterministicLeader?.timeline_score],
    ["Terms", view?.deterministicLeader?.terms_score],
    ["Risk", view?.deterministicLeader?.risk_score],
  ] as const;

  if (sessionLoading) return <div className="app"><AppHeader monogram="Q" name="QuoteSense" descriptor="procurement intelligence" sessionLabel="Checking session" status="warn"/><main className="shell"><div className="loading-row"><span className="spinner"/> Preparing secure procurement workspace…</div></main></div>;

  return (
    <div className="app app-quotesense">
      <AppHeader monogram="Q" name="QuoteSense" descriptor="procurement intelligence" sessionLabel={session.active ? `${session.provider || "Provider"} · ${session.model || "Connected"}` : "Session required"} status={session.active ? "good" : "warn"} actions={session.active ? <Button variant="quiet" onClick={() => void endSession()}>End session</Button> : null}/>
      <main className="shell">
        <PageHeader eyebrow="Procurement / decision intelligence" title="Make every quote comparable." description="Extract structured supplier data, validate the fields that matter, and keep deterministic scoring separate from qualitative recommendation." actions={<div className="quote-hero-actions"><StatusChip label="Deterministic scoring" tone="good"/><Button variant="quiet" onClick={showSampleWalkthrough}>Preview sample journey ↗</Button></div>}/>
        {!session.active ? <Notice tone="warning">{session.error || "Open QuoteSense from your authenticated Studio workspace to establish a secure session."}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice ? <Notice tone="success">{notice}</Notice> : null}
        {demoMode ? <Notice tone="info">Synthetic walkthrough: these supplier records and scores are illustrative. No quotation files were uploaded and no live model analysis was run.</Notice> : null}

        {(busy || processingEvents.length > 0 || demoMode) ? <ProcessingJourney events={processingEvents} busy={busy} example={demoMode}/> : null}

        <div className="grid quotesense-grid">
          <div className="stack">
            <Panel title="New quotation analysis" detail="Upload supplier documents to begin a structured review." actions={<StatusChip label={health === "online" ? "API online" : health === "checking" ? "Checking API" : "API unavailable"} tone={health === "online" ? "good" : "warn"}/> }>
              <form onSubmit={(event) => void analyze(event)}>
                <label className="file-drop quote-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); updateFiles(event.dataTransfer.files); }}><span className="file-drop-icon">＋</span><strong>{files.length ? `${files.length} quotation file${files.length === 1 ? "" : "s"} selected · add more` : "Drop 2–5 supplier quotations here or browse"}</strong><small>PDF · DOCX · TXT · XLSX · 50 MB each / 100 MB combined · selecting again adds files</small><input type="file" multiple accept=".pdf,.docx,.txt,.xlsx" disabled={!session.active || busy} onChange={(event) => { updateFiles(event.target.files); event.currentTarget.value = ""; }}/></label>
                {files.length ? <div className="selected-files">{files.map((file) => <div className="file-row" key={`${file.name}-${file.size}`}><span className="file-name">{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small><button type="button" className="text-action danger-text" onClick={() => setFiles((current) => current.filter((item) => item !== file))}>Remove</button></div>)}</div> : null}
                <Field label="Decision brief" hint="Describe the business context and what a reviewer should pay attention to."><textarea value={query} onChange={(event) => setQuery(event.target.value)} maxLength={4000} disabled={!session.active || busy}/></Field>
                <div className="field criteria-field"><span className="field-label">Qualitative review focus</span><div className="pill-list">{CRITERIA.map((item) => <button key={item} type="button" className={`pill ${criteria.includes(item) ? "selected" : ""}`} aria-pressed={criteria.includes(item)} onClick={() => setCriteria((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><small>These guide the model's written assessment. They do not change the deterministic score.</small></div>
                <div className="field scoring-weight-editor">
                  <div className="weight-editor-heading"><span className="field-label">Deterministic scoring weights</span><small>Set what matters most to this purchasing decision. The backend normalizes these values to 100%.</small></div>
                  <div className="weight-editor-grid">{CRITERIA.map((item) => <label className="weight-control" key={item}><span>{item[0].toUpperCase() + item.slice(1)}</span><span className="weight-control-input"><input type="number" min="0" max="100" step="5" value={scoringWeights[item] ?? 0} disabled={!session.active || busy} onChange={(event) => setScoringWeights((current) => ({ ...current, [item]: Math.max(0, Math.min(100, Number(event.target.value) || 0)) }))}/><small>%</small></span></label>)}</div>
                  <small className="weight-total">Entered weight total: {Object.values(scoringWeights).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0)}% · normalized at analysis time</small>
                </div>
                <div className="analysis-submit"><Button variant="primary" type="submit" disabled={!session.active || busy || files.length === 0}>{busy ? <><span className="spinner dark-spinner"/> Analyzing documents…</> : "Analyze quotations ↗"}</Button><small>Model extraction is followed by schema validation and deterministic calculations.</small></div>
              </form>
            </Panel>
            {result && view ? <Panel title="Supplier comparison" detail="Rankings are generated by the configured deterministic criteria." actions={<Button variant="quiet" onClick={() => downloadFile("quotesense-suppliers.csv", "text/csv;charset=utf-8", toSupplierCsv(result))}>Export CSV ↓</Button>}><SupplierComparison result={result}/></Panel> : <Panel title="Decision principles" detail="The analysis separates model extraction from procurement logic."><div className="principle-grid"><div><span>01</span><strong>Extract</strong><small>Documents become typed quotation records.</small></div><div><span>02</span><strong>Validate</strong><small>Missing fields and schema issues remain visible.</small></div><div><span>03</span><strong>Score</strong><small>Business rules calculate comparable scores.</small></div></div></Panel>}
          </div>
          <div className="stack">
            <Panel title="Analysis snapshot" detail={demoMode ? "Synthetic example · illustrative only" : result ? "Current analysis" : "Waiting for supplier documents"}>
              <div className="metric-row quote-metrics"><MetricCard label="Quotations" value={view?.quotations.length ?? "—"}/><MetricCard label="Completeness" value={view?.averageCompleteness === null || view?.averageCompleteness === undefined ? "—" : `${view.averageCompleteness.toFixed(1)}%`} tone={completenessTone}/><MetricCard label="High risks" value={view ? riskHighCount : "—"} tone={riskHighCount ? "warn" : "neutral"}/></div>
              {view ? <div className="decision-summary">
                <SectionLabel>Deterministic leader</SectionLabel>
                <div className="leader-card"><div><strong>{view.deterministicSupplier || "No scored supplier"}</strong><small>Highest returned deterministic score</small></div><strong className="leader-score">{topScore === null ? "—" : `${topScore?.toFixed(1)} / 100`}</strong></div>
                {primary ? <div className="recommendation-card"><span className="eyebrow">Qualitative recommendation</span><strong>{view.qualitativeSupplier || "Recommendation returned"}</strong><p>{String(primary.reason || "The model did not provide a recommendation rationale.")}</p>{view.recommendationDiffers ? <Notice tone="warning">This recommendation differs from the top deterministic score. Review the trade-off before deciding.</Notice> : null}</div> : null}
                <SectionLabel aside="Component scores">Score breakdown</SectionLabel>
                <div className="score-breakdown">{scoreComponents.map(([label, value]) => { const score = scoreNumber(value); return score === null ? null : <div className="score-line" key={label}><span>{label}</span><div className="metric-track"><i style={{ width: `${Math.max(0, Math.min(100, score))}%` }}/></div><strong>{score.toFixed(0)}</strong></div>; })}</div>
                {Object.keys(view.weights).length ? <div className="score-weight-breakdown"><span>Configured scoring weights</span><div>{Object.entries(view.weights).map(([criterion, weight]) => <small key={criterion}>{criterion[0].toUpperCase() + criterion.slice(1)} <strong>{(weight * 100).toFixed(0)}%</strong></small>)}</div></div> : null}
              </div> : <EmptyState title="No analysis yet" body="Upload at least one supplier quotation to see extracted fields, deterministic scores, risk signals and evidence."/>}
            </Panel>
            <Panel title="Risk register" detail="Review each flagged issue against the supporting source material.">
              {view?.risks.length ? <div className="risk-list">{view.risks.slice(0, 8).map((risk, index) => {
                const level = String(risk.level || risk.severity || "review");
                const items = Array.isArray(risk.items) ? risk.items.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
                return <article className="risk-item" key={`risk-${index}`}><div className="risk-item-head"><div><strong>{String(risk.supplier || risk.title || risk.name || `Supplier ${index + 1}`)}</strong><small>Rule-based commercial checks</small></div><StatusChip label={level} tone={level.toLowerCase() === "high" ? "bad" : level.toLowerCase() === "medium" ? "warn" : "neutral"}/></div>{items.length ? <ul className="risk-findings">{items.map((item, findingIndex) => <li key={findingIndex}>{item}</li>)}</ul> : <p>No rule-based risk findings were returned for this supplier. This does not guarantee the absence of commercial risk.</p>}</article>;
              })}</div> : <EmptyState title="No risk records" body="Risk findings will appear here after a successful analysis. A missing risk record is not a guarantee of no commercial risk."/>}
            </Panel>
          </div>
        </div>

        {result && view ? <ProcurementComparison result={result} onExport={() => downloadFile("quotesense-detailed-comparison.csv", "text/csv;charset=utf-8", toComparisonCsv(result))}/> : null}

        {result && view ? <section className="analysis-result-section">
          <div className="section-label"><span>02 / ANALYSIS DETAIL</span><small>Structured results · inspect before selecting a supplier</small></div>
          <Panel>
            <div className="tabs" role="tablist" aria-label="Analysis detail views"><button className="tab" role="tab" aria-selected={tab === "summary"} onClick={() => setTab("summary")}>Extracted quotations</button><button className="tab" role="tab" aria-selected={tab === "suppliers"} onClick={() => setTab("suppliers")}>Validation</button><button className="tab" role="tab" aria-selected={tab === "evidence"} onClick={() => setTab("evidence")}>Source evidence</button></div>
            {tab === "summary" ? <div className="quote-detail-grid">{view.quotations.map((quote, index) => <article className="quote-record" key={`quotation-${index}`}><div className="quote-record-head"><div><span className="eyebrow">SUPPLIER {String(index + 1).padStart(2, "0")}</span><h3>{String(quote.supplier || quote.vendor || `Quotation ${index + 1}`)}</h3></div><StatusChip label={String(quote.currency || "Currency unspecified")} /></div><div className="quote-attributes"><div><span>Total cost</span><strong>{displayCost(quote.total_cost, quote.currency)}</strong></div><div><span>Timeline</span><strong>{String(quote.delivery_timeline || "Not specified")}</strong></div><div><span>Validity</span><strong>{String(quote.validity_period || "Not specified")}</strong></div><div><span>Terms</span><strong>{String(quote.terms_conditions || "Not extracted")}</strong></div></div><p>{String(quote.project_description || "No project description was extracted.")}</p></article>)}</div> : null}
            {tab === "suppliers" ? <div className="validation-list">{view.validation.map((item, index) => <div className="validation-item" key={`validation-${index}`}><div><strong>{String(item.supplier || view.quotations[index]?.supplier || `Quotation ${index + 1}`)}</strong><small>{String(item.status || "Validation record")}</small></div><strong>{scoreNumber(item.completeness_score)?.toFixed(1) ?? "—"}% complete</strong><p>Missing fields: {Array.isArray(item.missing_fields) ? item.missing_fields.map(String).join(", ") || "None reported" : String(item.missing_fields || "Not provided")}</p></div>)}{!view.validation.length ? <EmptyState title="No validation detail" body="The response did not include per-quotation completeness records."/> : null}</div> : null}
            {tab === "evidence" ? <div className="source-list">{view.evidence.map((item, index) => <article className="source-card" key={`evidence-${index}`}><div className="source-card-top"><strong>{String(item.source || item.document || `Source ${index + 1}`)}</strong><small>{String(item.location || item.page || "Source reference")}</small></div><p>{String(item.text || item.excerpt || item.snippet || item.content || "Evidence record returned without an excerpt.")}</p></article>)}{!view.evidence.length ? <EmptyState title="No evidence excerpts returned" body="The analysis contains no source-level evidence entries to inspect."/> : null}</div> : null}
            <div className="export-row"><span>Export this response for audit or further review.</span><div className="toolbar"><Button onClick={() => downloadFile("quotesense-analysis.json", "application/json", JSON.stringify(result, null, 2))}>Download JSON ↓</Button><Button onClick={() => downloadFile("quotesense-suppliers.csv", "text/csv;charset=utf-8", toSupplierCsv(result))}>Supplier CSV ↓</Button></div></div>
          </Panel>
        </section> : null}
        <footer className="product-footnote">Use non-confidential sample documents in this demonstration. Verify extracted values and source evidence before making procurement decisions.</footer>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
