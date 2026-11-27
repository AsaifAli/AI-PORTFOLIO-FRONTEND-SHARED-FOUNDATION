import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient } from "@portfolio/api-client";
import { bootstrapSession, revokeSession, type SessionMetadata } from "@portfolio/session";
import { AppHeader, Button, EmptyState, Field, MetricCard, Notice, PageHeader, Panel, SectionLabel, StatusChip } from "@portfolio/ui";
import { getAnalysisView, scoreNumber, toSupplierCsv, validateQuoteUploads, type QuoteAnalysis } from "./data";
import "@portfolio/ui/styles.css";

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

function App() {
  const [session, setSession] = useState<SessionView>({ active: false });
  const [sessionLoading, setSessionLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("Compare these supplier quotations and identify commercial risks, missing terms, and the strongest evidence-backed option.");
  const [criteria, setCriteria] = useState<string[]>([...CRITERIA]);
  const [result, setResult] = useState<QuoteAnalysis | null>(null);
  const [tab, setTab] = useState<"summary" | "suppliers" | "evidence">("summary");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [health, setHealth] = useState<"checking" | "online" | "offline">("checking");

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
    if (!incoming) return;
    const next = Array.from(incoming);
    const validation = validateQuoteUploads(next);
    if (validation) { setError(validation); return; }
    setError(""); setFiles(next);
  }

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!session.active || busy) return;
    if (!files.length) { setError("Add at least one supplier quotation before starting the analysis."); return; }
    if (!criteria.length) { setError("Select at least one scoring criterion."); return; }
    setBusy(true); setError(""); setNotice(""); setResult(null);
    const form = new FormData();
    files.forEach((file) => form.append("files", file, file.name));
    form.append("query", query);
    form.append("criteria", criteria.join(","));
    try {
      const response = await api.request<QuoteAnalysis>("/api/v1/analyses", { method: "POST", body: form, signal: AbortSignal.timeout(180_000) });
      setResult(response); setTab("summary"); setNotice("Analysis completed. Scores and recommendations are shown separately so you can inspect their basis.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Quotation analysis failed. Check the API and retry."); }
    finally { setBusy(false); }
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
        <PageHeader eyebrow="Procurement / decision intelligence" title="Make every quote comparable." description="Extract structured supplier data, validate the fields that matter, and keep deterministic scoring separate from qualitative recommendation." actions={<StatusChip label="Deterministic scoring" tone="good"/>}/>
        {!session.active ? <Notice tone="warning">{session.error || "Open QuoteSense from your authenticated Studio workspace to establish a secure session."}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice ? <Notice tone="success">{notice}</Notice> : null}

        <div className="grid quotesense-grid">
          <div className="stack">
            <Panel title="New quotation analysis" detail="Upload supplier documents to begin a structured review." actions={<StatusChip label={health === "online" ? "API online" : health === "checking" ? "Checking API" : "API unavailable"} tone={health === "online" ? "good" : "warn"}/> }>
              <form onSubmit={(event) => void analyze(event)}>
                <label className="file-drop quote-drop"><span className="file-drop-icon">＋</span><strong>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} ready` : "Drop quotation files here or browse"}</strong><small>PDF · DOCX · TXT · XLSX · up to 5 files · 50 MB each / 100 MB total</small><input type="file" multiple accept=".pdf,.docx,.txt,.xlsx" disabled={!session.active || busy} onChange={(event) => { updateFiles(event.target.files); event.currentTarget.value = ""; }}/></label>
                {files.length ? <div className="selected-files">{files.map((file) => <div className="file-row" key={`${file.name}-${file.size}`}><span className="file-name">{file.name}</span><small>{(file.size / (1024 * 1024)).toFixed(1)} MB</small><button type="button" className="text-action danger-text" onClick={() => setFiles((current) => current.filter((item) => item !== file))}>Remove</button></div>)}</div> : null}
                <Field label="Decision brief" hint="Describe the business context and what a reviewer should pay attention to."><textarea value={query} onChange={(event) => setQuery(event.target.value)} maxLength={4000} disabled={!session.active || busy}/></Field>
                <div className="field criteria-field"><span className="field-label">Scoring criteria</span><div className="pill-list">{CRITERIA.map((item) => <button key={item} type="button" className={`pill ${criteria.includes(item) ? "selected" : ""}`} aria-pressed={criteria.includes(item)} onClick={() => setCriteria((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><small>Scoring weights and comparability checks are applied by the backend's deterministic business rules.</small></div>
                <div className="analysis-submit"><Button variant="primary" type="submit" disabled={!session.active || busy || files.length === 0}>{busy ? <><span className="spinner dark-spinner"/> Analyzing documents…</> : "Analyze quotations ↗"}</Button><small>Model extraction is followed by schema validation and deterministic calculations.</small></div>
              </form>
            </Panel>
            {result && view ? <Panel title="Supplier comparison" detail="Rankings are generated by the configured deterministic criteria." actions={<Button variant="quiet" onClick={() => downloadFile("quotesense-suppliers.csv", "text/csv;charset=utf-8", toSupplierCsv(result))}>Export CSV ↓</Button>}><SupplierComparison result={result}/></Panel> : <Panel title="Decision principles" detail="The analysis separates model extraction from procurement logic."><div className="principle-grid"><div><span>01</span><strong>Extract</strong><small>Documents become typed quotation records.</small></div><div><span>02</span><strong>Validate</strong><small>Missing fields and schema issues remain visible.</small></div><div><span>03</span><strong>Score</strong><small>Business rules calculate comparable scores.</small></div></div></Panel>}
          </div>
          <div className="stack">
            <Panel title="Analysis snapshot" detail={result ? "Current analysis" : "Waiting for supplier documents"}>
              <div className="metric-row quote-metrics"><MetricCard label="Quotations" value={view?.quotations.length ?? "—"}/><MetricCard label="Completeness" value={view?.averageCompleteness === null || view?.averageCompleteness === undefined ? "—" : `${view.averageCompleteness.toFixed(1)}%`} tone={completenessTone}/><MetricCard label="High risks" value={view ? riskHighCount : "—"} tone={riskHighCount ? "warn" : "neutral"}/></div>
              {view ? <div className="decision-summary">
                <SectionLabel>Deterministic leader</SectionLabel>
                <div className="leader-card"><div><strong>{view.deterministicSupplier || "No scored supplier"}</strong><small>Highest returned deterministic score</small></div><strong className="leader-score">{topScore === null ? "—" : `${topScore?.toFixed(1)} / 100`}</strong></div>
                {primary ? <div className="recommendation-card"><span className="eyebrow">Qualitative recommendation</span><strong>{view.qualitativeSupplier || "Recommendation returned"}</strong><p>{String(primary.reason || "The model did not provide a recommendation rationale.")}</p>{view.recommendationDiffers ? <Notice tone="warning">This recommendation differs from the top deterministic score. Review the trade-off before deciding.</Notice> : null}</div> : null}
                <SectionLabel aside="Component scores">Score breakdown</SectionLabel>
                <div className="score-breakdown">{scoreComponents.map(([label, value]) => { const score = scoreNumber(value); return score === null ? null : <div className="score-line" key={label}><span>{label}</span><div className="metric-track"><i style={{ width: `${Math.max(0, Math.min(100, score))}%` }}/></div><strong>{score.toFixed(0)}</strong></div>; })}</div>
              </div> : <EmptyState title="No analysis yet" body="Upload at least one supplier quotation to see extracted fields, deterministic scores, risk signals and evidence."/>}
            </Panel>
            <Panel title="Risk register" detail="Review each flagged issue against the supporting source material.">
              {view?.risks.length ? <div className="risk-list">{view.risks.slice(0, 8).map((risk, index) => <div className="risk-item" key={`risk-${index}`}><div><strong>{String(risk.title || risk.name || risk.risk || `Risk ${index + 1}`)}</strong><small>{String(risk.category || risk.type || "Commercial review")}</small></div><StatusChip label={String(risk.severity || risk.level || "Review")} tone={String(risk.severity || risk.level).toLowerCase() === "high" || risk.critical === true ? "bad" : "warn"}/><p>{String(risk.description || risk.reason || risk.detail || "Review this item against the source quotation.")}</p></div>)}</div> : <EmptyState title="No risk records" body="Risk findings will appear here after a successful analysis. A missing risk record is not a guarantee of no commercial risk."/>}
            </Panel>
          </div>
        </div>

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
