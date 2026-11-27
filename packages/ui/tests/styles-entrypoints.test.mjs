import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const activeWorkspaces = ["evidenceflow", "quotesense", "flowpilot", "evaluation-harness"];

for (const workspace of activeWorkspaces) {
  test(`${workspace} loads the shared and product-specific stylesheets`, async () => {
    const entrypoint = await readFile(resolve(root, "apps", workspace, "src", "main.tsx"), "utf8");
    assert.ok(entrypoint.includes('import "@portfolio/ui/styles.css";'));
    assert.ok(entrypoint.includes('import "./styles.css";'));
  });
}

test("the shared UI stylesheet respects reduced-motion preferences", async () => {
  const stylesheet = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
  assert.ok(stylesheet.includes("prefers-reduced-motion: reduce"));
});
