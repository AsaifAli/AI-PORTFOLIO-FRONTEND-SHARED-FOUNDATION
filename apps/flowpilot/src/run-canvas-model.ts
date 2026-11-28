export type RunEvent = {
  event: string;
  detail: Record<string, unknown>;
  created_at: string;
};

export type RunCanvasStep = {
  id: string;
  label: string;
  summary: string;
  state: "running" | "completed" | "failed";
  durationMs?: number;
  startedAt?: string;
  finishedAt?: string;
};

const DEFAULT_LABELS: Record<string, string> = {
  execute: "Execute workflow",
  validate: "Validate output",
};

function boundedText(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  return value.trim().slice(0, maxLength);
}

function boundedDuration(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : undefined;
}

/** Convert recorded LangGraph boundary events into a stable, chronological view model. */
export function buildRunCanvasSteps(events: RunEvent[]): RunCanvasStep[] {
  const steps = new Map<string, RunCanvasStep>();
  const ordered = [...events].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const event of ordered) {
    if (!["step_started", "step_completed", "step_failed"].includes(event.event)) continue;
    const detail = event.detail && typeof event.detail === "object" ? event.detail : {};
    const id = boundedText(detail.step_id, "", 48);
    if (!id) continue;

    const current = steps.get(id) ?? {
      id,
      label: boundedText(detail.label, DEFAULT_LABELS[id] ?? "Workflow step", 80),
      summary: "",
      state: "running" as const,
    };
    current.label = boundedText(detail.label, current.label, 80);
    current.summary = boundedText(detail.summary, current.summary, 240);

    if (event.event === "step_started") {
      current.state = "running";
      current.startedAt = event.created_at;
    } else {
      current.state = event.event === "step_failed" ? "failed" : "completed";
      current.finishedAt = event.created_at;
      current.durationMs = boundedDuration(detail.duration_ms);
    }
    steps.set(id, current);
  }

  return [...steps.values()];
}

export type RunCanvasSummary = {
  totalStages: number;
  completedStages: number;
  runningStages: number;
  failedStages: number;
  measuredDurationMs: number;
  eventCount: number;
  lastUpdatedAt?: string;
};

export type RunCanvasActivity = {
  id: string;
  label: string;
  tone: "neutral" | "success" | "warning" | "danger";
  createdAt: string;
};

function activityLabel(event: RunEvent): Omit<RunCanvasActivity, "id" | "createdAt"> | null {
  const detail = event.detail && typeof event.detail === "object" ? event.detail : {};
  const step = boundedText(detail.label, DEFAULT_LABELS[boundedText(detail.step_id, "", 48)] ?? "Workflow step", 80);
  switch (event.event) {
    case "queued": return { label: "Run queued", tone: "neutral" };
    case "started": return { label: "Worker started", tone: "neutral" };
    case "step_started": return { label: "Started " + step, tone: "neutral" };
    case "step_completed": return { label: "Completed " + step, tone: "success" };
    case "step_failed": return { label: "Failed " + step, tone: "danger" };
    case "awaiting_approval": return { label: "Waiting for human approval", tone: "warning" };
    case "human_approval": {
      const decision = detail.decision === "approved" ? "approved" : detail.decision === "rejected" ? "rejected" : "recorded";
      const index = typeof detail.item_index === "number" && Number.isInteger(detail.item_index) && detail.item_index >= 0
        ? "Draft " + (detail.item_index + 1) + " "
        : "";
      const label = decision === "recorded" ? "Approval recorded" : index ? index + decision : "Action " + decision;
      return { label, tone: decision === "approved" ? "success" : decision === "rejected" ? "danger" : "neutral" };
    }
    case "paused": return { label: "Run paused", tone: "warning" };
    case "resumed": return { label: "Run resumed", tone: "neutral" };
    case "completed": return { label: "Workflow completed", tone: "success" };
    case "completed_with_warnings": return { label: "Completed with warnings", tone: "warning" };
    case "failed": return { label: "Workflow failed", tone: "danger" };
    case "cancelled": return { label: "Run cancelled", tone: "warning" };
    default: return null;
  }
}

/** Summarize only actual event records; missing stage durations remain unestimated. */
export function buildRunCanvasSummary(events: RunEvent[]): RunCanvasSummary {
  const steps = buildRunCanvasSteps(events);
  const chronological = [...events].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return {
    totalStages: steps.length,
    completedStages: steps.filter((step) => step.state === "completed").length,
    runningStages: steps.filter((step) => step.state === "running").length,
    failedStages: steps.filter((step) => step.state === "failed").length,
    measuredDurationMs: steps.reduce((total, step) => total + (step.durationMs ?? 0), 0),
    eventCount: events.length,
    ...(chronological.length && chronological[chronological.length - 1].created_at
      ? { lastUpdatedAt: chronological[chronological.length - 1].created_at }
      : {}),
  };
}

/** Return a safe activity trail without reviewer identities, notes, prompts, or raw outputs. */
export function buildRunCanvasActivity(events: RunEvent[]): RunCanvasActivity[] {
  return [...events]
    .map((event, index) => ({ event, index }))
    .sort((a, b) =>
      new Date(a.event.created_at).getTime() - new Date(b.event.created_at).getTime() || a.index - b.index
    )
    .flatMap(({ event, index }) => {
      const label = activityLabel(event);
      return label ? [{ id: event.created_at + ":" + event.event + ":" + index, createdAt: event.created_at, ...label }] : [];
    });
}
