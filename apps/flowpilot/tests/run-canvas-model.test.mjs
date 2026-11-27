import test from "node:test";
import assert from "node:assert/strict";
import { buildRunCanvasSteps } from "../src/run-canvas-model.ts";

test("builds completed and live steps only from recorded LangGraph events", () => {
  const steps = buildRunCanvasSteps([
    { event: "queued", detail: {}, created_at: "2026-11-27T10:00:00Z" },
    { event: "step_started", detail: { step_id: "execute", label: "Analyse signals", summary: "Agent is processing." }, created_at: "2026-11-27T10:00:01Z" },
    { event: "step_completed", detail: { step_id: "execute", label: "Analyse signals", duration_ms: 840 }, created_at: "2026-11-27T10:00:02Z" },
    { event: "step_started", detail: { step_id: "validate", label: "Verify output" }, created_at: "2026-11-27T10:00:03Z" },
  ]);

  assert.deepEqual(steps.map((step) => [step.id, step.state]), [
    ["execute", "completed"],
    ["validate", "running"],
  ]);
  assert.equal(steps[0].durationMs, 840);
  assert.equal(steps[1].label, "Verify output");
});

test("returns no illustrative steps for historical runs with no detailed trace", () => {
  assert.deepEqual(buildRunCanvasSteps([
    { event: "queued", detail: {}, created_at: "2026-11-27T10:00:00Z" },
    { event: "started", detail: {}, created_at: "2026-11-27T10:00:01Z" },
    { event: "completed", detail: {}, created_at: "2026-11-27T10:00:02Z" },
  ]), []);
});

test("surfaces failures and bounds text and durations from event payloads", () => {
  const steps = buildRunCanvasSteps([
    { event: "step_started", detail: { step_id: "execute", label: "x".repeat(200) }, created_at: "2026-11-27T10:00:00Z" },
    { event: "step_failed", detail: { step_id: "execute", summary: "Provider failed", duration_ms: -1 }, created_at: "2026-11-27T10:00:01Z" },
  ]);
  assert.equal(steps[0].state, "failed");
  assert.equal(steps[0].label.length, 80);
  assert.equal(steps[0].durationMs, undefined);
});
