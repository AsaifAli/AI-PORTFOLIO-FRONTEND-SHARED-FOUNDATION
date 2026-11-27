import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Engineering Assurance fills the iframe canvas instead of capping at 1320px", async () => {
  const stylesheet = await readFile(resolve(root, "apps", "evaluation-harness", "src", "styles.css"), "utf8");
  assert.match(stylesheet, /\.evaluation-app\s*\{[^}]*width:\s*100%/s);
  assert.match(stylesheet, /\.shell\s*\{[^}]*width:\s*100%/s);
  assert.match(stylesheet, /\.shell\s*\{[^}]*max-width:\s*1680px/s);
  assert.doesNotMatch(stylesheet, /\.shell\s*\{[^}]*max-width:\s*1320px/s);
});

test("Engineering Assurance project cards reflow before becoming too narrow", async () => {
  const stylesheet = await readFile(resolve(root, "apps", "evaluation-harness", "src", "styles.css"), "utf8");
  assert.match(stylesheet, /@media\s*\(max-width:\s*1180px\)[\s\S]*\.application-grid\s*\{[^}]*repeat\(2,/s);
  assert.match(stylesheet, /@media\s*\(max-width:\s*760px\)[\s\S]*\.application-grid\s*\{[^}]*1fr/s);
});
