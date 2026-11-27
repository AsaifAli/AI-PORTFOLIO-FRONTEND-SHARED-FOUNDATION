import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("shared application canvas expands to the available desktop width", async () => {
  const stylesheet = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
  assert.match(stylesheet, /\.shell\s*\{[^}]*width:\s*min\(100%,\s*1680px\)/s);
  assert.match(stylesheet, /\.shell\s*\{[^}]*max-width:\s*1680px/s);
  assert.match(stylesheet, /#root\s*,\s*\.app\s*\{[^}]*width:\s*100%/s);
});

test("shared application canvas preserves readable gutters on smaller screens", async () => {
  const stylesheet = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
  assert.match(stylesheet, /@media\s*\(max-width:\s*600px\)[\s\S]*\.shell\s*\{[^}]*padding:\s*20px\s+15px/s);
});
