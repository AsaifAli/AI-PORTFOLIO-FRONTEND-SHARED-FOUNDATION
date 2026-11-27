import assert from "node:assert/strict";
import test from "node:test";
import { isValidHandoffCode, parseHandoffLocation } from "../src/index.ts";

test("strips a single-use handoff code while preserving unrelated URL state", () => {
  const parsed = parseHandoffLocation("/workspace/apps/evidenceflow", "?tab=research&portfolio_llm_handoff=Abcdefghijklmnopqrstuvwxyz123456", "#chat");
  assert.equal(parsed.code, "Abcdefghijklmnopqrstuvwxyz123456");
  assert.equal(parsed.changed, true);
  assert.equal(parsed.cleanUrl, "/workspace/apps/evidenceflow?tab=research#chat");
});

test("rejects legacy reusable tokens and removes them from the URL", () => {
  const parsed = parseHandoffLocation("/", "?portfolio_llm_session=secret&view=1");
  assert.equal(parsed.legacyLink, true);
  assert.equal(parsed.code, "");
  assert.equal(parsed.cleanUrl, "/?view=1");
});

test("rejects malformed handoff codes", () => {
  const parsed = parseHandoffLocation("/", "?portfolio_llm_handoff=short");
  assert.equal(parsed.invalidCode, true);
  assert.equal(parsed.code, "");
  assert.equal(isValidHandoffCode("short"), false);
  assert.equal(isValidHandoffCode("A".repeat(36)), true);
});
