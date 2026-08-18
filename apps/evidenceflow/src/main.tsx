import React from "react";
import { createRoot } from "react-dom/client";
import { bootstrapSession } from "@portfolio/session";
import { StatusChip, Panel } from "@portfolio/ui";
import "./styles.css";

bootstrapSession();

function App() {
  return <div className="app" data-product="evidenceflow">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">E</div><div className="brand-copy"><strong>EvidenceFlow</strong><span>research workstation</span></div></div>
      <div className="top-actions"><StatusChip label="Portfolio session" tone="good"/><button className="btn ghost desktop-only">Settings</button></div>
    </header>
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">Verified RAG & Research</div><h1>EvidenceFlow</h1><p>Explore evidence with adaptive retrieval, reranking, and fail-closed citation verification.</p></div><div className="toolbar"><StatusChip label="React frontend foundation"/><StatusChip label="API adapter pending" tone="warn"/></div></section>
      <div className="grid"><div className="stack"><Panel><div className="toolbar"><StatusChip label="Agentic route ready" tone="good"/><span style={{color:"var(--muted)",fontSize:12}}>KB · Web · Hybrid · Direct</span></div><div className="workspace"><div className="workspace-copy"><strong>Ask an evidence-grounded question</strong><p>Streaming chat, adaptive retrieval, RRF fusion, reranking, and citation verification plug into this research workspace.</p><button className="btn primary">Start research thread</button></div></div></Panel><Panel><h2>Evidence pipeline</h2><div className="timeline"><div className="timeline-row"><i className="dot done"/><div><strong>Route decision</strong><span>Choose knowledge base, web research, both, or direct response.</span></div></div><div className="timeline-row"><i className="dot done"/><div><strong>Hybrid retrieval + RRF</strong><span>Dense and sparse retrieval are fused before reranking.</span></div></div><div className="timeline-row"><i className="dot live"/><div><strong>Verification</strong><span>Citations are authorized against the evidence supplied to the model.</span></div></div></div></Panel></div><div className="stack"><Panel><h2>Evidence registry</h2><div className="feature-list"><div className="feature"><strong>Source A · KB</strong><span>Waiting for the first research turn.</span></div><div className="feature"><strong>Source B · Web</strong><span>Web evidence appears here with turn-scoped IDs.</span></div></div></Panel><Panel><h2>Session</h2><div className="metric-row"><div className="metric"><span>Thread</span><strong>New</strong></div><div className="metric"><span>Citations</span><strong>0</strong></div><div className="metric"><span>Tokens</span><strong>—</strong></div></div></Panel></div></div>
    </main>
  </div>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
