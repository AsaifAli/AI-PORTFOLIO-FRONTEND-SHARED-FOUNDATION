import test from "node:test";
import assert from "node:assert/strict";
import { buildRunCanvasActivity, buildRunCanvasSummary } from "../src/run-canvas-model.ts";

test("summarizes only measured stage durations while counting actual run events", () => {
  const events = [
    { event: "queued", detail: {}, created_at: "2026-11-28T10:00:00Z" },
    { event: "step_started", detail: { step_id: "execute" }, created_at: "2026-11-28T10:00:01Z" },
    { event: "step_completed", detail: { step_id: "execute", duration_ms: 780 }, created_at: "2026-11-28T10:00:02Z" },
    { event: "step_started", detail: { step_id: "validate" }, created_at: "2026-11-28T10:00:03Z" },
    { event: "started", detail: {}, created_at: "2026-11-28T10:00:00.500Z" },
  ];

  assert.deepEqual(buildRunCanvasSummary(events), {
    totalStages: 2,
    completedStages: 1,
    runningStages: 1,
    failedStages: 0,
    measuredDurationMs: 780,
    eventCount: 5,
    lastUpdatedAt: "2026-11-28T10:00:03Z",
  });
});

test("builds a chronological, privacy-safe activity trail from lifecycle and approval events", () => {
  const activity = buildRunCanvasActivity([
    { event: "human_approval", detail: { decision: "approved", item_index: 1, reviewer: "private-user-id", note: "private note" }, created_at: "2026-11-28T10:00:04Z" },
    { event: "step_completed", detail: { step_id: "execute", label: "Analyse brief" }, created_at: "2026-11-28T10:00:02Z" },
    { event: "awaiting_approval", detail: {}, created_at: "2026-11-28T10:00:03Z" },
    { event: "queued", detail: {}, created_at: "2026-11-28T10:00:01Z" },
    { event: "internal_secret_event", detail: { label: "Do not show" }, created_at: "2026-11-28T10:00:05Z" },
  ]);

  assert.deepEqual(activity.map((item) => [item.label, item.tone]), [
    ["Run queued", "neutral"],
    ["Completed Analyse brief", "success"],
    ["Waiting for human approval", "warning"],
    ["Draft 2 approved", "success"],
  ]);

  assert.deepEqual(buildRunCanvasActivity([
    { event: "human_approval", detail: { decision: "rejected" }, created_at: "2026-11-28T10:00:06Z" },
  ]).map((item) => item.label), ["Action rejected"]);
  assert.equal(JSON.stringify(activity).includes("private-user-id"), false);
  assert.equal(JSON.stringify(activity).includes("private note"), false);
});
