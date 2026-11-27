/* global Response, Headers, FormData, Blob */
import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient } from "../src/index.ts";

test("API requests use same-origin HttpOnly cookies and never add browser bearer tokens", async () => {
  let captured;
  const client = createApiClient("/api/workspace/apps/quotesense", {
    fetcher: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  await client.post("/api/v1/analyses", { query: "compare" });
  assert.equal(captured.url, "/api/workspace/apps/quotesense/api/v1/analyses");
  assert.equal(captured.init.credentials, "include");
  assert.equal(captured.init.cache, "no-store");
  assert.equal(new Headers(captured.init.headers).has("authorization"), false);
});

test("multipart uploads preserve the browser-generated boundary", async () => {
  let captured;
  const client = createApiClient("/api/workspace/apps/quotesense", {
    fetcher: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  const form = new FormData();
  form.append("files", new Blob(["quotation"]), "quote.txt");
  await client.request("/api/v1/analyses", { method: "POST", body: form });
  assert.equal(new Headers(captured.init.headers).has("content-type"), false);
  assert.equal(captured.init.body, form);
});
