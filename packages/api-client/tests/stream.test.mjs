/* global Response, Headers, FormData, Blob, AbortController, ReadableStream, TextEncoder */
import assert from "node:assert/strict";
import test from "node:test";
import { createApiClient } from "../src/index.ts";

test("stream posts multipart data through the same-origin workspace proxy and returns the final analysis", async () => {
  let captured;
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: stage\\ndata: {"stage":"extract","status":"started"}\\n\\n'));
      controller.enqueue(encoder.encode('event: result\\ndata: {"status":"success","scores":[]}\\n\\n'));
      controller.close();
    },
  });
  const client = createApiClient("/api/workspace/apps/quotesense", {
    fetcher: async (url, init) => {
      captured = { url, init };
      return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
    },
  });
  const form = new FormData();
  form.append("files", new Blob(["synthetic"]), "synthetic.txt");
  const received = [];
  const result = await client.stream("/api/v1/analyses/stream", form, (event) => received.push(event));

  assert.equal(captured.url, "/api/workspace/apps/quotesense/api/v1/analyses/stream");
  assert.equal(captured.init.credentials, "include");
  assert.equal(captured.init.cache, "no-store");
  assert.equal(new Headers(captured.init.headers).get("accept"), "text/event-stream");
  assert.equal(new Headers(captured.init.headers).has("authorization"), false);
  assert.equal(new Headers(captured.init.headers).has("x-llm-gateway-token"), false);
  assert.equal(new Headers(captured.init.headers).has("content-type"), false);
  assert.equal(result.status, "success");
  assert.equal(received[0].event, "stage");
  assert.equal(received[0].data.stage, "extract");
});

test("stream surfaces structured upstream errors without parsing them as successful results", async () => {
  const client = createApiClient("/api/workspace/apps/quotesense", {
    fetcher: async () => new Response(JSON.stringify({ detail: "The project session expired." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }),
  });
  await assert.rejects(
    () => client.stream("/api/v1/analyses/stream", new FormData(), () => {}),
    /project session expired/i,
  );
});
