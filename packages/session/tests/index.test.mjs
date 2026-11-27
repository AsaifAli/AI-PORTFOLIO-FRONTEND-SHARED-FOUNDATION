/* global Headers, Response */
import assert from "node:assert/strict";
import test from "node:test";
import { bootstrapSession, isValidHandoffCode, parseHandoffLocation } from "../src/index.ts";

test("strips a single-use handoff code while preserving unrelated URL state", () => {
  const parsed = parseHandoffLocation("/workspace", "?tab=research&portfolio_llm_handoff=Abcdefghijklmnopqrstuvwxyz123456", "#chat");
  assert.equal(parsed.code, "Abcdefghijklmnopqrstuvwxyz123456");
  assert.equal(parsed.changed, true);
  assert.equal(parsed.cleanUrl, "/workspace?tab=research#chat");
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


test("rejects a present but empty single-use handoff parameter", () => {
  const parsed = parseHandoffLocation("/workspace/apps/quotesense", "?portfolio_llm_handoff=");
  assert.equal(parsed.changed, true);
  assert.equal(parsed.invalidCode, true);
  assert.equal(parsed.code, "");
});

test("bootstraps a same-origin cookie session only after removing the one-time code", async () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const code = "Abcdefghijklmnopqrstuvwxyz123456";
  let cleanedUrl = "";
  const calls = [];
  globalThis.window = {
    location: { pathname: "/workspace/apps/quotesense", search: `?tab=analysis&portfolio_llm_handoff=${code}`, hash: "#results" },
    history: { replaceState: (_state, _title, url) => { cleanedUrl = String(url); } },
  };
  globalThis.document = { title: "QuoteSense" };

  try {
    const metadata = await bootstrapSession({
      exchangePath: "/api/workspace/apps/quotesense/session/exchange",
      sessionPath: "/api/workspace/apps/quotesense/session",
      fetcher: async (url, init) => {
        assert.equal(cleanedUrl, "/workspace/apps/quotesense?tab=analysis#results");
        calls.push({ url, init });
        if (url.endsWith("/session/exchange")) {
          assert.equal(init.method, "POST");
          assert.equal(init.credentials, "include");
          assert.equal(init.cache, "no-store");
          assert.deepEqual(JSON.parse(init.body), { code });
          const headers = new Headers(init.headers);
          assert.equal(headers.has("authorization"), false);
          return new Response(JSON.stringify({ exchanged: true }), { status: 200 });
        }
        assert.equal(url, "/api/workspace/apps/quotesense/session");
        assert.equal(init.method, "GET");
        assert.equal(init.credentials, "include");
        return new Response(JSON.stringify({ active: true, project: "quotesense", provider: "openai", model: "gpt-4o-mini" }), { status: 200 });
      },
    });

    assert.equal(metadata.active, true);
    assert.equal(metadata.project, "quotesense");
    assert.equal(calls.length, 2);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
