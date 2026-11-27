import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient } from "@portfolio/api-client";
import { bootstrapSession, revokeSession, type SessionMetadata } from "@portfolio/session";
import { AppHeader, Button, EmptyState, Field, MetricCard, Notice, PageHeader, Panel, StatusChip } from "@portfolio/ui";
import "@portfolio/ui/styles.css";
import { initializeSharedAppTheme } from "@portfolio/ui/theme";
import "./styles.css";

initializeSharedAppTheme();

type JsonRecord = Record<string, unknown>;
type RunRecord = {
  run_id: string;
  workflow: string;
  status: string;
  output?: JsonRecord;
  evidence?: JsonRecord[];
  warnings?: string[];
  duration_ms?: number;
  created_at?: string;
  usage?: JsonRecord;
};
type ApprovalRecord = { run_id: string; workflow: string; created_at?: string; approval?: JsonRecord };
type WorkflowRecord = { name: string; purpose: string };
type SessionView = SessionMetadata & { error?: string };
type WorkflowName = "content" | "competitor" | "outreach" | "kpi";

const api = createApiClient("/api/workspace/apps/flowpilot");
const WORKFLOW_INFO: Record<WorkflowName, { title: string; detail: string; description: string }> = {
  content: { title: "Content studio", detail: "Drafts for channel-specific review", description: "Generate platform-aware content and approve each draft individually. Publishing remains outside this demo." },
  competitor: { title: "Competitor intelligence", detail: "Evidence-oriented market brief", description: "Compare named competitors and optionally include an RSS or Atom source for current signals." },
  outreach: { title: "Partner outreach", detail: "Qualification with a human approval gate", description: "Prepare outreach drafts. A reviewer must authorize the proposed action; nothing is sent." },
  kpi: { title: "KPI briefing", detail: "Progress, metrics and blockers", description: "Normalize an operating update into a concise leadership briefing." },
};
const asRecords = (value: unknown): JsonRecord[] => Array.isArray(value) ? value.filter((item): item is JsonRecord => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
const textValue = (value: unknown, fallback = "—") => typeof value === "string" && value.trim() ? value : value === null || value === undefined ? fallback : String(value);
const isActive = (status: unknown) => ["queued", "running", "pending", "paused"].includes(String(status || "").toLowerCase());
const formatTime = (value?: string) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Recently";

function WorkflowForm({ workflow, onSubmit, busy }: { workflow: WorkflowName; onSubmit: (payload: JsonRecord) => void; busy: boolean }) {
  const [briefs, setBriefs] = useState("AI agents in enterprise finance operations, including reconciliation and exception handling");
  const [channels, setChannels] = useState(["linkedin", "x", "telegram"]);
  const [tone, setTone] = useState("insightful");
  const [competitors, setCompetitors] = useState("Example Protocol, Example AI Startup");
  const [sourceUrl, setSourceUrl] = useState("");
  const [candidate, setCandidate] = useState("Demo Partner");
  const [context, setContext] = useState("AI infrastructure collaboration");
  const [channel, setChannel] = useState("linkedin");
  const [entity, setEntity] = useState("Demo Portfolio");
  const [metric, setMetric] = useState("weekly progress");
  const [value, setValue] = useState("on track");
  const [blocker, setBlocker] = useState("None reported");
  const [localError, setLocalError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault(); setLocalError("");
    if (workflow === "content") {
      const topics = briefs.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
      if (!topics.length || topics.length > 5) { setLocalError("Add between one and five complete briefs, one per line."); return; }
      if (!channels.length) { setLocalError("Select at least one destination channel."); return; }
      onSubmit({ topics, channels, tone });
    } else if (workflow === "competitor") {
      const names = competitors.split(",").map((item) => item.trim()).filter(Boolean);
      if (!names.length) { setLocalError("Add at least one competitor to compare."); return; }
      if (sourceUrl && !/^https:\/\//i.test(sourceUrl)) { setLocalError("Optional RSS/Atom URLs must use HTTPS."); return; }
      onSubmit({ competitors: names, ...(sourceUrl ? { sources: [{ name: "Runtime source", url: sourceUrl }] } : {}) });
    } else if (workflow === "outreach") {
      if (!candidate.trim() || !context.trim()) { setLocalError("Add a candidate name and relationship context."); return; }
      onSubmit({ candidates: [{ name: candidate.trim(), type: "partner", context: context.trim(), channel }] });
    } else {
      if (!entity.trim() || !metric.trim() || !value.trim()) { setLocalError("Entity, metric and value are required."); return; }
      onSubmit({ updates: [{ entity: entity.trim(), metric: metric.trim(), value: value.trim(), blocker: blocker.trim() }] });
    }
  }

  return <form className="workflow-form" onSubmit={submit}>
    {workflow === "content" ? <>
      <Field label="Content briefs" hint="One complete brief per line. Up to five briefs per run."><textarea rows={4} maxLength={5000} value={briefs} onChange={(event) => setBriefs(event.target.value)}/></Field>
      <div className="field"><span className="field-label">Channels</span><div className="pill-list">{["linkedin", "x", "telegram"].map((item) => <button className={`pill ${channels.includes(item) ? "selected" : ""}`} aria-pressed={channels.includes(item)} type="button" key={item} onClick={() => setChannels((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{item === "x" ? "X" : item[0].toUpperCase() + item.slice(1)}</button>)}</div></div>
      <Field label="Tone"><select value={tone} onChange={(event) => setTone(event.target.value)}><option value="insightful">Insightful</option><option value="executive">Executive</option><option value="technical">Technical</option><option value="concise">Concise</option></select></Field>
    </> : null}
    {workflow === "competitor" ? <>
      <Field label="Competitors" hint="Separate names with commas."><input value={competitors} onChange={(event) => setCompetitors(event.target.value)} maxLength={1000}/></Field>
      <Field label="Optional RSS / Atom source" hint="Only trusted, public HTTPS feeds should be used."><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://example.com/feed.xml"/></Field>
    </> : null}
    {workflow === "outreach" ? <>
      <Field label="Candidate / organisation"><input value={candidate} onChange={(event) => setCandidate(event.target.value)} maxLength={160}/></Field>
      <Field label="Relationship context"><textarea rows={3} value={context} onChange={(event) => setContext(event.target.value)} maxLength={2000}/></Field>
      <Field label="Preferred channel"><select value={channel} onChange={(event) => setChannel(event.target.value)}><option value="email">Email</option><option value="linkedin">LinkedIn</option><option value="x">X</option><option value="telegram">Telegram</option></select></Field>
    </> : null}
    {workflow === "kpi" ? <>
      <Field label="Entity / team"><input value={entity} onChange={(event) => setEntity(event.target.value)}/></Field>
      <Field label="Metric"><input value={metric} onChange={(event) => setMetric(event.target.value)}/></Field>
      <Field label="Current value"><input value={value} onChange={(event) => setValue(event.target.value)}/></Field>
      <Field label="Blocker / dependency"><textarea rows={2} value={blocker} onChange={(event) => setBlocker(event.target.value)}/></Field>
    </> : null}
    {localError ? <Notice tone="error">{localError}</Notice> : null}
    <div className="workflow-form-foot"><span>Execution is queued through the existing FlowPilot API and worker path.</span><Button variant="primary" type="submit" disabled={busy}>{busy ? <><span className="spinner dark-spinner"/> Queueing…</> : "Queue workflow ↗"}</Button></div>
  </form>;
}

function OutputPreview({ run }: { run: RunRecord }) {
  const output = run.output ?? {};
  const workflow = run.workflow as WorkflowName;
  const entries = workflow === "content" ? asRecords(output.posts) : workflow === "outreach" ? asRecords(output.candidates) : workflow === "competitor" ? asRecords(output.competitors || output.findings || output.signals) : asRecords(output.updates || output.summary);
  if (run.status === "failed" || output.error) return <Notice tone="error">{textValue(output.failure_reason || output.error, "Workflow execution failed.")} {output.recovery ? ` ${String(output.recovery)}` : ""}</Notice>;
  if (entries.length) return <div className="output-list">{entries.slice(0, 12).map((entry, index) => <article className="output-item" key={`${workflow}-${index}`}><div className="output-item-head"><strong>{textValue(entry.topic || entry.name || entry.title || entry.entity, `${WORKFLOW_INFO[workflow]?.title || "Workflow"} item ${index + 1}`)}</strong>{entry.channel ? <StatusChip label={String(entry.channel)}/> : null}</div><p>{textValue(entry.draft || entry.message || entry.summary || entry.detail || entry.value, "No text output was returned.")}</p>{entry.reason ? <small>{String(entry.reason)}</small> : null}</article>)}</div>;
  return <pre className="json-output">{JSON.stringify(output, null, 2)}</pre>;
}

function App() {
  const [session, setSession] = useState<SessionView>({ active: false });
  const [sessionLoading, setSessionLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [workflow, setWorkflow] = useState<WorkflowName>("content");
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"runs" | "approvals">("runs");
  const [apiHealthy, setApiHealthy] = useState(false);

  const refresh = useCallback(async () => {
    const [workflowData, runData, approvalData] = await Promise.all([
      api.get<{ workflows?: WorkflowRecord[] }>("/api/v1/workflows"),
      api.get<{ runs?: RunRecord[] }>("/api/v1/runs?limit=30"),
      api.get<{ approvals?: ApprovalRecord[] }>("/api/v1/approvals?limit=50"),
    ]);
    setWorkflows(Array.isArray(workflowData.workflows) ? workflowData.workflows : []);
    const nextRuns = Array.isArray(runData.runs) ? runData.runs : [];
    setRuns(nextRuns);
    setApprovals(Array.isArray(approvalData.approvals) ? approvalData.approvals : []);
    setSelectedRun((current) => current ? nextRuns.find((run) => run.run_id === current.run_id) ?? current : nextRuns[0] ?? null);
    setApiHealthy(true);
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const status = await bootstrapSession({
        exchangePath: "/api/workspace/apps/flowpilot/session/exchange",
        sessionPath: "/api/workspace/apps/flowpilot/session",
      });
      if (!alive) return;
      setSession(status); setSessionLoading(false);
      if (status.active) {
        try { await refresh(); }
        catch (caught) { if (alive) { setApiHealthy(false); setError(caught instanceof Error ? caught.message : "FlowPilot API unavailable."); } }
      }
    })();
    return () => { alive = false; };
  }, [refresh]);

  const hasActiveRun = useMemo(() => runs.some((run) => isActive(run.status)), [runs]);
  useEffect(() => {
    if (!session.active || !hasActiveRun) return;
    const timer = window.setInterval(() => {
      void refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Run status refresh failed."));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [session.active, hasActiveRun, refresh]);

  const totalQueued = runs.filter((run) => ["queued", "pending"].includes(run.status)).length;
  const totalRunning = runs.filter((run) => ["running", "paused"].includes(run.status)).length;

  async function startRun(payload: JsonRecord) {
    if (busy || !session.active) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api.post<RunRecord>("/api/v1/runs", { workflow, payload });
      setSelectedRun(result);
      setNotice(`Run ${result.run_id.slice(0, 8)} accepted by the FlowPilot control plane.`);
      setTab("runs");
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The workflow could not be queued."); }
    finally { setBusy(false); }
  }

  async function controlRun(run: RunRecord, action: "pause" | "resume" | "stop") {
    setError(""); setNotice("");
    try {
      const result = await api.post<RunRecord>(`/api/v1/runs/${encodeURIComponent(run.run_id)}/${action}`, {});
      setNotice(`Run ${run.run_id.slice(0, 8)}: ${textValue(result.status, action)}.`);
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : `Could not ${action} this run.`); }
  }

  async function decideApproval(approval: ApprovalRecord, decision: "approved" | "rejected", itemIndex?: number) {
    const key = `${approval.run_id}:${itemIndex ?? "all"}`;
    setError("");
    try {
      await api.post(`/api/v1/runs/${encodeURIComponent(approval.run_id)}/approval`, {
        decision,
        ...(itemIndex !== undefined ? { item_index: itemIndex } : {}),
        note: reviewNotes[key] || "",
      });
      setReviewNotes((current) => ({ ...current, [key]: "" }));
      setNotice(itemIndex !== undefined ? `Draft ${itemIndex + 1} ${decision}. Remaining drafts still require their own decision.` : `The proposed ${approval.workflow} action was ${decision}. No external message was sent.`);
      await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Approval decision could not be recorded."); }
  }

  async function endSession() {
    try { await revokeSession("/api/workspace/apps/flowpilot/session/revoke"); setSession({ active: false }); setRuns([]); setApprovals([]); setSelectedRun(null); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not end the session."); }
  }

  if (sessionLoading) return <div className="app"><AppHeader monogram="F" name="FlowPilot" descriptor="workflow operations" sessionLabel="Checking session" status="warn"/><main className="shell"><div className="loading-row"><span className="spinner"/> Connecting to the workflow control plane…</div></main></div>;

  return <div className="app app-flowpilot">
    <AppHeader monogram="F" name="FlowPilot" descriptor="workflow operations · control plane" sessionLabel={session.active ? `${session.provider || "Provider"} · ${session.model || "Connected"}` : "Session required"} status={session.active ? "good" : "warn"} actions={<><StatusChip label={apiHealthy ? "API online" : "API offline"} tone={apiHealthy ? "good" : "warn"}/>{session.active ? <Button variant="quiet" onClick={() => void endSession()}>End session</Button> : null}</>}/>
    <main className="shell">
      <PageHeader eyebrow="Orchestration / human-in-the-loop" title="Keep work moving. Keep decisions human." description="Launch asynchronous workflows, track their state and review every proposed external-impact action before it can proceed." actions={<StatusChip label="Execution stays queued" tone="good"/>}/>
      {!session.active ? <Notice tone="warning">{session.error || "Open FlowPilot from your authenticated Studio workspace to establish a secure project session."}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <div className="metric-row"><MetricCard label="Tracked runs" value={runs.length}/><MetricCard label="Queued" value={totalQueued} tone={totalQueued ? "warn" : "neutral"}/><MetricCard label="Active / paused" value={totalRunning} tone={totalRunning ? "good" : "neutral"}/><MetricCard label="Pending approval" value={approvals.length} tone={approvals.length ? "warn" : "neutral"}/></div>

      <div className="section-label"><span>01 / WORKFLOW BUILDER</span><small>{workflows.length ? `${workflows.length} backend workflows available` : "Waiting for API workflow registry"}</small></div>
      <div className="workflow-builder-grid">
        <Panel title="Configure an execution" detail="Inputs are validated before the existing worker queue receives a run.">
          <div className="workflow-picker">{(["content", "competitor", "outreach", "kpi"] as WorkflowName[]).map((item) => <button key={item} type="button" className={`workflow-option ${workflow === item ? "active" : ""}`} onClick={() => setWorkflow(item)}><span>{item === "content" ? "01" : item === "competitor" ? "02" : item === "outreach" ? "03" : "04"}</span><strong>{WORKFLOW_INFO[item].title}</strong><small>{WORKFLOW_INFO[item].detail}</small></button>)}</div>
          <div className="workflow-form-heading"><div><span className="eyebrow">{workflow.toUpperCase()} / CONFIGURATION</span><h3>{WORKFLOW_INFO[workflow].title}</h3><p>{WORKFLOW_INFO[workflow].description}</p></div></div>
          <WorkflowForm key={workflow} workflow={workflow} onSubmit={(payload) => void startRun(payload)} busy={busy}/>
        </Panel>
        <div className="stack">
          <Panel title="Execution lifecycle" detail="Observed state from the FlowPilot API."><div className="lifecycle"><div className="lifecycle-step"><span className="lifecycle-index">01</span><div><strong>Submit</strong><small>Validate typed inputs and queue a run.</small></div><StatusChip label="Ready" tone="good"/></div><div className="lifecycle-step"><span className="lifecycle-index">02</span><div><strong>Execute</strong><small>Existing orchestrator and worker run the selected graph.</small></div><StatusChip label={hasActiveRun ? "Active" : "On demand"} tone={hasActiveRun ? "good" : "neutral"}/></div><div className="lifecycle-step"><span className="lifecycle-index">03</span><div><strong>Review</strong><small>Content and outreach checkpoints remain approval-gated.</small></div><StatusChip label={approvals.length ? `${approvals.length} pending` : "Human gate"} tone={approvals.length ? "warn" : "neutral"}/></div></div></Panel>
          <Panel title="Selected run" detail={selectedRun ? `Reference ${selectedRun.run_id}` : "Choose a run to inspect its output and evidence."}>
            {selectedRun ? <><div className="selected-run-head"><StatusChip label={selectedRun.status.replace(/_/g, " ")} tone={selectedRun.status === "failed" ? "bad" : isActive(selectedRun.status) || selectedRun.status === "awaiting_approval" ? "warn" : "good"}/><span>{WORKFLOW_INFO[selectedRun.workflow as WorkflowName]?.title || selectedRun.workflow}</span></div><div className="run-meta"><div><small>Started</small><strong>{formatTime(selectedRun.created_at)}</strong></div><div><small>Duration</small><strong>{selectedRun.duration_ms === undefined ? "In progress" : `${selectedRun.duration_ms} ms`}</strong></div><div><small>Usage</small><strong>{textValue(selectedRun.usage?.total_tokens, "Not recorded")} tokens</strong></div></div><OutputPreview run={selectedRun}/>{selectedRun.evidence?.length ? <div className="evidence-list">{selectedRun.evidence.slice(0, 4).map((item, index) => <div className="source-card" key={index}><strong>{textValue(item.title, "Execution evidence")}</strong><p>{textValue(item.detail)}</p></div>)}</div> : null}<div className="run-controls">{selectedRun.status === "running" || selectedRun.status === "queued" ? <><Button onClick={() => void controlRun(selectedRun, "pause")}>Pause</Button><Button variant="danger" onClick={() => void controlRun(selectedRun, "stop")}>Stop run</Button></> : null}{selectedRun.status === "paused" ? <><Button variant="primary" onClick={() => void controlRun(selectedRun, "resume")}>Resume</Button><Button variant="danger" onClick={() => void controlRun(selectedRun, "stop")}>Stop run</Button></> : null}</div></> : <EmptyState title="No run selected" body="Queue a workflow or select a run in the run history to inspect the result."/>}
          </Panel>
        </div>
      </div>

      <section className="run-section">
        <div className="section-label"><span>02 / OPERATIONS & REVIEW</span><small>Refreshes every four seconds while jobs are active</small></div>
        <Panel>
          <div className="tabs" role="tablist" aria-label="Run history and approval inbox"><button className="tab" role="tab" aria-selected={tab === "runs"} onClick={() => setTab("runs")}>Run history <span>{runs.length}</span></button><button className="tab" role="tab" aria-selected={tab === "approvals"} onClick={() => setTab("approvals")}>Approval inbox <span>{approvals.length}</span></button><Button variant="quiet" onClick={() => void refresh().catch((caught) => setError(caught instanceof Error ? caught.message : "Refresh failed."))}>Refresh ↻</Button></div>
          {tab === "runs" ? <div className="run-list">{runs.length ? runs.map((run) => <button className={`run-row ${selectedRun?.run_id === run.run_id ? "active" : ""}`} key={run.run_id} onClick={() => setSelectedRun(run)}><div className="run-row-main"><strong>{WORKFLOW_INFO[run.workflow as WorkflowName]?.title || run.workflow}</strong><small>{run.run_id.slice(0, 12)} · {formatTime(run.created_at)}</small></div><StatusChip label={run.status.replace(/_/g, " ")} tone={run.status === "failed" ? "bad" : isActive(run.status) || run.status === "awaiting_approval" ? "warn" : "good"}/><span className="run-row-chevron">↗</span></button>) : <EmptyState title="No workflow runs yet" body="Queue a workflow above. Its status and run reference will appear here."/>}</div> : <div className="approval-list">{approvals.length ? approvals.map((item) => {
            const detail = item.approval ?? {};
            const items = asRecords(detail.items);
            const isContent = item.workflow === "content";
            const approved = items.filter((entry) => entry.approval_status === "approved").length;
            const rejected = items.filter((entry) => entry.approval_status === "rejected").length;
            return <article className="approval-card" key={`${item.run_id}-${item.workflow}`}><div className="approval-card-head"><div><span className="eyebrow">{item.workflow.toUpperCase()} / REVIEW REQUIRED</span><h3>{textValue(detail.title, WORKFLOW_INFO[item.workflow as WorkflowName]?.title || "Workflow approval")}</h3><p>{textValue(detail.summary, "Review the staged output before authorizing it.")}</p></div><StatusChip label={isContent ? `${items.length - approved - rejected} awaiting` : "Action review"} tone="warn"/></div>{isContent ? <><div className="approval-progress"><span>{approved} approved</span><span>{rejected} rejected</span><span>{Math.max(0, items.length - approved - rejected)} pending</span></div>{items.map((draft, index) => { const status = String(draft.approval_status || "pending"); const key = `${item.run_id}:${index}`; return <div className="approval-item" key={key}><div className="approval-item-head"><div><strong>Draft {index + 1} · {textValue(draft.channel, "Channel")} </strong><small>{textValue(draft.topic, "Content draft")}</small></div><StatusChip label={status} tone={status === "approved" ? "good" : status === "rejected" ? "bad" : "warn"}/></div><p>{textValue(draft.draft, "No draft text returned.")}</p>{status === "pending" ? <><Field label="Reviewer note"><input value={reviewNotes[key] || ""} maxLength={1000} onChange={(event) => setReviewNotes((current) => ({ ...current, [key]: event.target.value }))} placeholder="Optional reasoning for the audit trail"/></Field><div className="approval-actions"><Button variant="primary" onClick={() => void decideApproval(item, "approved", index)}>Approve this draft</Button><Button variant="danger" onClick={() => void decideApproval(item, "rejected", index)}>Reject this draft</Button></div></> : null}{status !== "pending" && draft.note ? <small>Reviewer note: {String(draft.note)}</small> : null}</div>; })}</> : <>{items.map((entry, index) => <div className="approval-item" key={index}><strong>{textValue(entry.name, "Proposed recipient / action")}</strong><p>{textValue(entry.message, "No message preview was returned.")}</p><small>{textValue(entry.reason, "")}</small></div>)}<Field label="Reviewer note"><input value={reviewNotes[`${item.run_id}:all`] || ""} maxLength={1000} onChange={(event) => setReviewNotes((current) => ({ ...current, [`${item.run_id}:all`]: event.target.value }))}/></Field><div className="approval-actions"><Button variant="primary" onClick={() => void decideApproval(item, "approved")}>Approve action</Button><Button variant="danger" onClick={() => void decideApproval(item, "rejected")}>Reject action</Button></div></>}</article>;
          }) : <EmptyState title="No pending approvals" body="Content and outreach proposals appear here after the workflow reaches its human-review checkpoint."/>}</div>}
        </Panel>
      </section>
      <footer className="product-footnote">Approval records authorization only. This demonstration has no connected publish or send action; no external content is published and no message is sent.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
