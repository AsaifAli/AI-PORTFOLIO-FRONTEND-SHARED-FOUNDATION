/* global Response, Headers, FormData, Blob, AbortController */
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


test("API client rejects cross-origin and protocol-relative base URLs", () => {
  assert.throws(() => createApiClient("https://api.example.test"), /same-origin path/);
  assert.throws(() => createApiClient("//api.example.test"), /same-origin path/);
});

test("API client strips caller-supplied bearer and Gateway credential headers", async () => {
  let captured;
  const client = createApiClient("/api/v1", {
    fetcher: async (url, init) => {
      captured = { url, init };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });

  await client.get("/private", new AbortController().signal);
  // A separate request exercises the public options boundary, where a product
  // component might accidentally try to attach a reusable project credential.
  await client.request("/private", {
    headers: {
      Authorization: "Bearer reusable-gateway-jwt",
      "X-LLM-Gateway-Token": "reusable-gateway-jwt",
    },
  });

  const headers = new Headers(captured.init.headers);
  assert.equal(headers.has("authorization"), false);
  assert.equal(headers.has("x-llm-gateway-token"), false);
  assert.equal(captured.init.credentials, "include");
  assert.equal(captured.init.cache, "no-store");
});


test("API client rejects request paths that are not same-origin paths", async () => {
  const client = createApiClient("/api/v1", {
    fetcher: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  });
  await assert.rejects(() => client.get("https://api.example.test/private"), /same-origin path/);
  await assert.rejects(() => client.get("//api.example.test/private"), /same-origin path/);
});
