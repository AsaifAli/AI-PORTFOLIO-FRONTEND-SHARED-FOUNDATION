import React from "react";
import { createRoot } from "react-dom/client";
import { StatusChip, Panel } from "@portfolio/ui";
import "./styles.css";

function App() {
  return <div className="app" data-product="legacylens">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">L</div><div className="brand-copy"><strong>LegacyLens</strong><span>developer workbench</span></div></div>
      <div className="top-actions"><StatusChip label="Portfolio session" tone="good"/><button className="btn ghost desktop-only">Settings</button></div>
    </header>
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">Agentic Software Modernization</div><h1>LegacyLens</h1><p>Analyze repositories, plan migrations, transform code, and inspect post-migration quality gates.</p></div><div className="toolbar"><StatusChip label="React frontend foundation"/><StatusChip label="API adapter pending" tone="warn"/></div></section>
      <div className="grid"><div className="stack"><Panel><div className="toolbar"><button className="btn primary">Select repository</button><button className="btn">Start migration</button></div><div className="workspace"><div className="workspace-copy"><strong>Developer modernization workbench</strong><p>Analyze a repository, build a Qdrant-backed knowledge base, plan the migration, transform code, and inspect the release gate.</p></div></div></Panel><Panel><h2>Migration pipeline</h2><div className="timeline"><div className="timeline-row"><i className="dot done"/><div><strong>Scan</strong><span>Language, symbols, dependencies, and technology detection.</span></div></div><div className="timeline-row"><i className="dot done"/><div><strong>Knowledge base</strong><span>Qdrant-backed source and target context.</span></div></div><div className="timeline-row"><i className="dot live"/><div><strong>Plan → Convert</strong><span>Agentic planning and context-grounded transformation.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Quality gate</strong><span>Compile/test/build checks and risk reporting.</span></div></div></div></Panel></div><div className="stack"><Panel><h2>Architecture signals</h2><div className="feature-list"><div className="feature"><strong>Knowledge graph</strong><span>Repository intelligence and metadata-aware retrieval.</span></div><div className="feature"><strong>Migration plan</strong><span>Target structure and dependency-aware transformation.</span></div><div className="feature"><strong>Release gate</strong><span>Deterministic validation with bounded repair.</span></div></div></Panel><Panel><h2>Session</h2><StatusChip label="Gateway session ready when launched from portfolio" tone="good"/></Panel></div></div>
    </main>
  </div>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
