import React from "react";
import { createRoot } from "react-dom/client";
import { bootstrapSession } from "@portfolio/session";
import { StatusChip, Panel } from "@portfolio/ui";
import "./styles.css";

bootstrapSession();

function App() {
  return <div className="app" data-product="quotesense">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">Q</div><div className="brand-copy"><strong>QuoteSense</strong><span>procurement analytics</span></div></div>
      <div className="top-actions"><StatusChip label="Portfolio session" tone="good"/><button className="btn ghost desktop-only">Settings</button></div>
    </header>
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">Procurement Intelligence</div><h1>QuoteSense</h1><p>Compare supplier quotations with structured extraction, deterministic scoring, risk signals, and evidence.</p></div><div className="toolbar"><StatusChip label="React frontend foundation"/><StatusChip label="API adapter pending" tone="warn"/></div></section>
      <div className="grid"><div className="stack"><Panel><div className="toolbar"><button className="btn primary">Upload quotations</button><button className="btn">New analysis</button><StatusChip label="Deterministic scoring" tone="good"/></div><div className="workspace"><div className="workspace-copy"><strong>Quotation comparison workspace</strong><p>Drop PDF, DOCX, TXT, or XLSX files here. Extraction, validation, scoring, and evidence remain backed by the existing API.</p></div></div></Panel><Panel><h2>Supplier comparison</h2><div className="metric-row"><div className="metric"><span>Suppliers</span><strong>0</strong></div><div className="metric"><span>Complete</span><strong>—</strong></div><div className="metric"><span>Risk flags</span><strong>—</strong></div></div></Panel></div><div className="stack"><Panel><h2>Analysis stages</h2><div className="timeline"><div className="timeline-row"><i className="dot live"/><div><strong>Ingest</strong><span>Multi-format document ingestion.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Extract + validate</strong><span>Structured fields with schema checks.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Score + recommend</strong><span>Deterministic business logic and evidence.</span></div></div></div></Panel><Panel><h2>Risk signals</h2><div className="empty-state"><strong>No analysis yet</strong><span>Risk and completeness signals will appear after the first run.</span></div></Panel></div></div>
    </main>
  </div>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
