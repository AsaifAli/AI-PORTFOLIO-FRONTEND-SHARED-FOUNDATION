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
