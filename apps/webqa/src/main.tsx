import React from "react";
import { createRoot } from "react-dom/client";
import { bootstrapSession } from "@portfolio/session";
import { StatusChip, Panel } from "@portfolio/ui";
import "./styles.css";

bootstrapSession();

function App() {
  return <div className="app" data-product="webqa">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">W</div><div className="brand-copy"><strong>WebQA</strong><span>qa control room</span></div></div>
      <div className="top-actions"><StatusChip label="Portfolio session" tone="good"/><button className="btn ghost desktop-only">Settings</button></div>
    </header>
    <main className="shell">
      <section className="hero"><div><div className="eyebrow">Web QA Intelligence</div><h1>WebQA</h1><p>Crawl dynamic sites, surface QA risks, generate test plans, and inspect regression signals.</p></div><div className="toolbar"><StatusChip label="React frontend foundation"/><StatusChip label="API adapter pending" tone="warn"/></div></section>
      <div className="grid"><div className="stack"><Panel><div className="toolbar"><div style={{flex:1}}><div className="code">https://example.com</div></div><button className="btn primary">Start crawl</button></div><div className="workspace"><div className="workspace-copy"><strong>Browser intelligence console</strong><p>Safe-by-default crawling, structured DOM analysis, QA risk scoring, generated tests, and regression evidence.</p></div></div></Panel><Panel><h2>Latest crawl</h2><div className="metric-row"><div className="metric"><span>Pages</span><strong>0</strong></div><div className="metric"><span>Risks</span><strong>0</strong></div><div className="metric"><span>Requests</span><strong>0</strong></div></div></Panel></div><div className="stack"><Panel><h2>QA workflow</h2><div className="timeline"><div className="timeline-row"><i className="dot live"/><div><strong>Discover</strong><span>Playwright same-domain crawl.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Assess</strong><span>DOM, forms, controls, console and network signals.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Plan tests</strong><span>Evidence-grounded QA scenarios.</span></div></div><div className="timeline-row"><i className="dot"/><div><strong>Compare</strong><span>Regression baselines and structural change.</span></div></div></div></Panel><Panel><h2>Safety boundary</h2><p>Normal crawling discovers interactions but does not submit forms or trigger arbitrary business actions.</p></Panel></div></div>
    </main>
  </div>
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
