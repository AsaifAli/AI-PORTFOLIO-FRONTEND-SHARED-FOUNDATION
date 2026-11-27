import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient } from "@portfolio/api-client";
import { bootstrapSession, revokeSession, type SessionMetadata } from "@portfolio/session";
import { AppHeader, Button, EmptyState, Field, MetricCard, Notice, PageHeader, SectionLabel, StatusChip } from "@portfolio/ui";
import "@portfolio/ui/styles.css";

type ChatSummary = { thread_id: string; title: string; updated_at?: string; message_count: number };
type DocumentRecord = { document_id: string; name: string; chunk_count?: number; scope: "global" | "chat"; created_at?: string; visual_pages_processed?: number; modalities?: string[] };
type ResearchOutcome = { final_answer?: string; abstained?: boolean; chunks?: unknown[]; web_sources?: unknown[]; citations?: unknown[]; [key: string]: unknown };
type ChatMessage = { id: string; role: "user" | "assistant"; content: string; meta?: ResearchOutcome; kind?: string; created_at?: string };
type ChatRecord = { thread_id: string; title: string; messages: ChatMessage[]; uploaded_docs?: DocumentRecord[]; updated_at?: string };
type SessionView = SessionMetadata & { error?: string };

const api = createApiClient("/api/v1");
const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Just now";
const getRecordArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

async function streamResearch(threadId: string, message: string, onToken: (token: string) => void, onStatus: (status: string) => void): Promise<{ message: ChatMessage; outcome: ResearchOutcome }> {
  const response = await fetch(`/api/v1/chats/${encodeURIComponent(threadId)}/messages`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "text/event-stream", "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null) as { detail?: string; error?: string } | null;
    throw new Error(payload?.detail || payload?.error || `Research request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let final: { message: ChatMessage; outcome: ResearchOutcome } | null = null;
  const dispatch = (frame: string) => {
    let event = "message";
    const data: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return;
    const payload = JSON.parse(data.join("\n")) as Record<string, unknown>;
    if (event === "status") onStatus(String(payload.text || "Working through the evidence"));
    if (event === "token") onToken(String(payload.text || ""));
    if (event === "final") final = payload as unknown as { message: ChatMessage; outcome: ResearchOutcome };
    if (event === "error") throw new Error(String(payload.message || "Research could not be completed."));
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary).replace(/\r$/, "");
        buffer = buffer.slice(boundary + 2);
        if (frame.trim()) dispatch(frame);
        boundary = buffer.indexOf("\n\n");
      }
      if (done) break;
    }
    if (buffer.trim()) dispatch(buffer);
  } finally {
    reader.releaseLock();
  }
  if (!final) throw new Error("The research stream ended without a verified final response.");
  return final;
}

function EvidencePanel({ outcome }: { outcome?: ResearchOutcome }) {
  if (!outcome) return null;
  const chunks = getRecordArray<Record<string, unknown>>(outcome.chunks);
  const citations = getRecordArray<Record<string, unknown>>(outcome.citations);
  const webSources = getRecordArray<Record<string, unknown>>(outcome.web_sources);
  const sources = [...citations, ...chunks, ...webSources].slice(0, 12);
  if (!sources.length) return null;
  return (
    <div className="evidence-inline">
      <SectionLabel aside={`${sources.length} references`}>Evidence attached to this answer</SectionLabel>
      <div className="source-list">
        {sources.map((source, index) => {
          const title = String(source.title || source.name || source.source || source.document_name || source.url || `Evidence item ${index + 1}`);
          const excerpt = String(source.text || source.content || source.snippet || source.excerpt || source.description || "Source reference recorded by the research pipeline.");
          const location = [source.page, source.chunk_id, source.location].filter(Boolean).join(" · ");
          return <div className="source-card" key={`${title}-${index}`}><div className="source-card-top"><strong>{title}</strong>{location ? <small>{String(location)}</small> : null}</div><p>{excerpt.slice(0, 900)}</p></div>;
        })}
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<SessionView>({ active: false });
  const [sessionLoading, setSessionLoading] = useState(true);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChat, setActiveChat] = useState<ChatRecord | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [draft, setDraft] = useState("");
  const [uploadScope, setUploadScope] = useState<"global" | "chat">("global");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showLibrary, setShowLibrary] = useState(true);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const loadChats = useCallback(async () => {
    const result = await api.get<{ data?: ChatSummary[] }>("/chats");
    const rows = getRecordArray<ChatSummary>(result.data);
    setChats(rows);
    return rows;
  }, []);

  const loadDocuments = useCallback(async (threadId?: string) => {
    const suffix = threadId ? `?scope=all&thread_id=${encodeURIComponent(threadId)}` : "?scope=global";
    const result = await api.get<{ data?: DocumentRecord[] }>(`/documents${suffix}`);
    setDocuments(getRecordArray<DocumentRecord>(result.data));
  }, []);

  const openChat = useCallback(async (threadId: string) => {
    const record = await api.get<ChatRecord>(`/chats/${encodeURIComponent(threadId)}`);
    setActiveChat(record);
    await loadDocuments(threadId);
  }, [loadDocuments]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await bootstrapSession({ exchangePath: "/api/v1/session/exchange", sessionPath: "/api/v1/session" });
      if (cancelled) return;
      setSession(result);
      setSessionLoading(false);
      if (!result.active) return;
      try {
        const rows = await loadChats();
        if (!cancelled && rows[0]) await openChat(rows[0].thread_id);
        else if (!cancelled) await loadDocuments();
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load the research workspace.");
      }
    })();
    return () => { cancelled = true; };
  }, [loadChats, loadDocuments, openChat]);

  const citationsCount = useMemo(() => {
    const outcome = activeChat?.messages?.slice().reverse().find((item) => item.role === "assistant")?.meta;
    return getRecordArray(outcome?.chunks).length + getRecordArray(outcome?.web_sources).length + getRecordArray(outcome?.citations).length;
  }, [activeChat]);

  async function createChat() {
    setError("");
    setBusy(true);
    try {
      const created = await api.post<ChatRecord>("/chats", {});
      setActiveChat(created);
      setChats((current) => [{ thread_id: created.thread_id, title: created.title, message_count: 0 }, ...current]);
      await loadDocuments(created.thread_id);
      composerRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a conversation.");
    } finally { setBusy(false); }
  }

  async function deleteChat(threadId: string) {
    if (!window.confirm("Delete this conversation and its chat-scoped documents?")) return;
    setError("");
    try {
      await api.delete(`/chats/${encodeURIComponent(threadId)}`);
      const remaining = chats.filter((chat) => chat.thread_id !== threadId);
      setChats(remaining);
      if (activeChat?.thread_id === threadId) {
        setActiveChat(null);
        setDocuments([]);
        if (remaining[0]) await openChat(remaining[0].thread_id);
      }
      setNotice("Conversation removed.");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete the conversation."); }
  }

  async function sendMessage(text = draft) {
    const message = text.trim();
    if (!message || busy) return;
    setError(""); setNotice(""); setBusy(true); setDraft(""); setStreamText(""); setStreamStatus("Starting research");
    try {
      let thread = activeChat;
      if (!thread) {
        thread = await api.post<ChatRecord>("/chats", {});
        setActiveChat(thread);
      }
      const optimistic: ChatMessage = { id: `local-${Date.now()}`, role: "user", content: message };
      setActiveChat((current) => ({ ...(current || thread!), messages: [...(current?.messages || thread!.messages || []), optimistic], thread_id: thread!.thread_id, title: thread!.title }));
      const result = await streamResearch(thread.thread_id, message, (token) => setStreamText((current) => current + token), setStreamStatus);
      setActiveChat((current) => current ? ({ ...current, messages: [...current.messages.filter((item) => !item.id.startsWith("local-") || item.content !== message), result.message], title: current.title === "New conversation" ? message.slice(0, 50) : current.title }) : current);
      await loadChats();
      await loadDocuments(thread.thread_id);
      setStreamText(""); setStreamStatus("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Research could not be completed.");
      setDraft(message);
    } finally { setBusy(false); }
  }

  async function uploadDocument(file?: File) {
    if (!file || uploading) return;
    if (uploadScope === "chat" && !activeChat) {
      setError("Create or select a conversation before uploading a chat-only document.");
      return;
    }
    setUploading(true); setError(""); setNotice("");
    const form = new FormData();
    form.append("file", file);
    form.append("scope", uploadScope);
    if (uploadScope === "chat" && activeChat) form.append("thread_id", activeChat.thread_id);
    try {
      const result = await api.request<{ document: DocumentRecord; duplicate?: boolean }>("/documents", { method: "POST", body: form });
      await loadDocuments(activeChat?.thread_id);
      setNotice(result.duplicate ? `${file.name} is already in this library.` : `${file.name} added · ${result.document.chunk_count ?? 0} passages indexed.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Document ingestion failed."); }
    finally { setUploading(false); }
  }

  async function removeDocument(document: DocumentRecord) {
    try {
      const query = new URLSearchParams({ scope: document.scope });
      if (document.scope === "chat" && activeChat) query.set("thread_id", activeChat.thread_id);
      await api.delete(`/documents/${encodeURIComponent(document.document_id)}?${query}`);
      await loadDocuments(activeChat?.thread_id);
      setNotice(`${document.name} removed from the active library.`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not remove this document."); }
  }

  async function endSession() {
    try { await revokeSession("/api/v1/session/revoke"); setSession({ active: false }); setChats([]); setActiveChat(null); setDocuments([]); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not end the session."); }
  }

  const latestOutcome = activeChat?.messages?.slice().reverse().find((item) => item.role === "assistant")?.meta;
  const abstained = latestOutcome?.abstained === true;

  if (sessionLoading) return <div className="app"><AppHeader monogram="E" name="EvidenceFlow" descriptor="verified research workspace" sessionLabel="Checking session" status="warn"/><main className="shell"><div className="loading-row"><span className="spinner"/> Establishing a secure research session…</div></main></div>;

  return (
    <div className="app app-evidenceflow">
      <AppHeader monogram="E" name="EvidenceFlow" descriptor="sparse-first RAG · research" sessionLabel={session.active ? `${session.provider || "Provider"} · ${session.model || "Connected"}` : "Session required"} status={session.active ? "good" : "warn"} actions={session.active ? <Button variant="quiet" onClick={() => void endSession()}>End session</Button> : null}/>
      <main className="shell">
        <PageHeader eyebrow="Research / evidence intelligence" title="Answers should survive inspection." description="A research workspace built around sparse-first retrieval, reranking and citation verification. The final answer is only as strong as the evidence attached to it." actions={<StatusChip label="Evidence-led · fail-closed" tone="good"/>}/>
        {!session.active ? <Notice tone="warning">{session.error || "Open EvidenceFlow from your authenticated Studio workspace to establish a secure session."}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {notice ? <Notice tone="success">{notice}</Notice> : null}
        <div className="metric-row product-metrics">
          <MetricCard label="Research threads" value={chats.length}/>
          <MetricCard label="Indexed documents" value={documents.length}/>
          <MetricCard label="Latest references" value={citationsCount} detail="Retrieved + web sources"/>
        </div>

        <div className="section-label"><span>01 / RESEARCH WORKSPACE</span><small>Each thread keeps its own history and evidence context</small></div>
        <div className="chat-layout">
          <aside className="chat-sidebar">
            <div className="chat-sidebar-head"><strong>Conversations</strong><Button variant="quiet" onClick={() => void createChat()} disabled={!session.active || busy}>＋ New</Button></div>
            {chats.length ? <div className="chat-list">{chats.map((chat) => <div className={`chat-list-row ${activeChat?.thread_id === chat.thread_id ? "active" : ""}`} key={chat.thread_id}><button className={`chat-item ${activeChat?.thread_id === chat.thread_id ? "active" : ""}`} type="button" onClick={() => void openChat(chat.thread_id)}><span>{chat.title || "New conversation"}</span><small>{chat.message_count}</small></button><button className="chat-delete" title="Delete conversation" onClick={() => void deleteChat(chat.thread_id)}>×</button></div>)}</div> : <p className="subtle">Your research history will appear here.</p>}
            <div className="divider"/>
            <div className="chat-sidebar-head"><strong>Knowledge library</strong><button className="text-action" onClick={() => setShowLibrary((value) => !value)}>{showLibrary ? "Hide" : "Show"}</button></div>
            {showLibrary ? <>
              <Field label="Document scope"><select className="control" value={uploadScope} onChange={(event) => setUploadScope(event.target.value as "global" | "chat")}><option value="global">Workspace library</option><option value="chat">This conversation</option></select></Field>
              <label className="file-drop document-drop"><span className="file-drop-title">{uploading ? "Indexing document…" : "Add a source document"}</span><small>PDF · DOCX · TXT · XLSX</small><input type="file" accept=".pdf,.docx,.txt,.xlsx" disabled={!session.active || uploading} onChange={(event) => { void uploadDocument(event.target.files?.[0]); event.currentTarget.value = ""; }}/></label>
              <div className="library-list">{documents.length ? documents.map((document) => <div className="file-row" key={document.document_id}><div className="file-meta"><span className="file-name">{document.name}</span><small>{document.chunk_count ?? 0} passages · {document.scope === "global" ? "Workspace" : "Conversation"}</small></div><button className="text-action danger-text" onClick={() => void removeDocument(document)} title={`Remove ${document.name}`}>Remove</button></div>) : <p className="subtle">No documents indexed yet.</p>}</div>
            </> : null}
          </aside>

          <section className="chat-main">
            <div className="chat-toolbar"><div><strong>{activeChat?.title || "New research thread"}</strong><small>{activeChat?.updated_at ? `Updated ${dateLabel(activeChat.updated_at)}` : "Start with a question or add a source"}</small></div><div className="toolbar"><StatusChip label="BM25 + adaptive retrieval"/><StatusChip label="Citation checks" tone="good"/></div></div>
            <div className="chat-stream" aria-live="polite">
              {activeChat?.messages?.length ? activeChat.messages.map((message) => <React.Fragment key={message.id}><article className={`message ${message.role}`}><span className="message-role">{message.role === "assistant" ? "EvidenceFlow" : "You"}</span><div className="message-content">{message.content}</div>{message.role === "assistant" && message.meta?.abstained ? <div className="notice notice-warning">Insufficient evidence. The system did not establish enough support for a reliable answer.</div> : null}{message.role === "assistant" ? <EvidencePanel outcome={message.meta}/> : null}</article></React.Fragment>) : <EmptyState title="Start with a research question" body="Ask a specific question, or upload a document to create a searchable knowledge base. EvidenceFlow will show its sources and explicitly abstain when support is insufficient." action={<div className="suggestion-list"><button className="suggestion" onClick={() => void sendMessage("Summarise the key claims in the uploaded documents and cite the supporting passages.")}>Summarise these sources <span>↗</span></button><button className="suggestion" onClick={() => void sendMessage("What is uncertain or unsupported in the available evidence?")}>Find gaps in the evidence <span>↗</span></button></div>}/>}
              {busy ? <article className="message assistant stream-message"><span className="message-role">EvidenceFlow · {streamStatus || "Researching"}</span>{streamText ? <div className="message-content">{streamText}</div> : <div className="loading-row"><span className="spinner"/> {streamStatus || "Retrieving and checking evidence"}</div>}</article> : null}
            </div>
            <form className="composer" onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
              <textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Ask a question about your documents or research topic…" disabled={!session.active || busy}/>
              <div className="composer-foot"><small>Enter to send · Shift + Enter for a new line</small><Button variant="primary" type="submit" disabled={!session.active || busy || !draft.trim()}>{busy ? "Researching…" : "Run research ↗"}</Button></div>
            </form>
            {abstained ? <Notice tone="warning">Latest response was marked insufficient-evidence. Review the source panel before using it.</Notice> : null}
          </section>
        </div>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);
