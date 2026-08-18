import React from "react";
import { createRoot } from "react-dom/client";
import { bootstrapSession } from "@portfolio/session";
import { StatusChip, Panel } from "@portfolio/ui";
import "./styles.css";

bootstrapSession();

function App() {
  return <div className="app" data-product="flowpilot">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">F</div><div className="brand-copy"><strong>FlowPilot</strong><span>operations console</span></div></div>
      <div className="top-actions"><StatusChip label="Portfolio session" tone="good"/><button className="btn ghost desktop-only">Settings</button></div>
    </header>
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">AI Automation Command Center</div><h1>FlowPilot</h1><p>Run observable agentic workflows with evidence, approvals, schedules, and durable state.</p></div><div className="toolbar"><StatusChip label="React frontend foundation"/><StatusChip label="API adapter pending" tone="warn"/></div></section>
      <div className="grid"><div className="stack"><Panel><div className="toolbar"><button className="btn primary">Create workflow run</button><StatusChip label="Control plane ready" tone="good"/></div><div className="feature-list"><div className="feature"><strong>Content</strong><span>Channel-aware generation with validation.</span></div><div className="feature"><strong>Competitor intelligence</strong><span>Evidence-aware monitoring and signal extraction.</span></div><div className="feature"><strong>Outreach</strong><span>Approval-controlled external-impact workflow.</span></div><div className="feature"><strong>KPI reporting</strong><span>Leadership summaries, blockers, and audit history.</span></div></div></Panel><Panel><h2>Run queue</h2><div className="empty-state"><strong>No active runs</strong><span>Submitted workflows will appear here with live state, evidence, and approval status.</span></div></Panel></div><div className="stack"><Panel><h2>Operations</h2><div className="metric-row"><div className="metric"><span>Queued</span><strong>0</strong></div><div className="metric"><span>Running</span><strong>0</strong></div><div className="metric"><span>Approvals</span><strong>0</strong></div></div></Panel><Panel><h2>Workflow lifecycle</h2><div className="timeline"><div className="timeline-row"><i className="dot done"/><div><strong>Validate</strong><span>Typed request contract.</span></div></div><div className="timeline-row"><i className="dot live"/><div><strong>Execute</strong><span>Agent workflow with evidence.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Audit</strong><span>Persisted run and approval history.</span></div></div></div></Panel></div></div>
    </main>
  </div>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
