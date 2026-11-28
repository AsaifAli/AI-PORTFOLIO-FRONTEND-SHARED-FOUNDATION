import test from "node:test";
import assert from "node:assert/strict";
import { filterRuns } from "../src/operations-model.ts";

const runs = [
  { run_id: "run-alpha-123", workflow: "content", status: "awaiting_approval" },
  { run_id: "run-beta-456", workflow: "competitor", status: "completed" },
  { run_id: "run-gamma-789", workflow: "outreach", status: "failed" },
];

test("filters runs by case-insensitive workflow or run reference", () => {
  assert.deepEqual(filterRuns(runs, "COMPETITOR", "all").map((run) => run.run_id), ["run-beta-456"]);
  assert.deepEqual(filterRuns(runs, "gamma", "all").map((run) => run.run_id), ["run-gamma-789"]);
});

test("combines query and status filters without mutating run history", () => {
  assert.deepEqual(filterRuns(runs, "run-", "awaiting_approval").map((run) => run.run_id), ["run-alpha-123"]);
  assert.equal(runs.length, 3);
});

test("returns all runs when the search and status filters are empty", () => {
  assert.deepEqual(filterRuns(runs, "  ", "all"), runs);
});
