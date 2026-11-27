import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const apps = ["evidenceflow", "quotesense", "flowpilot", "evaluation-harness"];

for (const app of apps) {
  test(`${app} subscribes to the shared workspace theme`, async () => {
    const source = await readFile(resolve(root, "apps", app, "src", "main.tsx"), "utf8");
    assert.match(source, /initializeSharedAppTheme/);
    assert.match(source, /initializeSharedAppTheme\(\)/);
  });
}

test("shared product tokens provide a readable light palette", async () => {
  const css = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
  assert.match(css, /:root\[data-theme=["']light["']\]/);
  assert.match(css, /color-scheme:\s*light/);
  assert.match(css, /--surface:\s*#fff/i);
  assert.match(css, /--text:\s*#[0-9a-f]{6}/i);
});

test("Engineering Assurance provides its own light palette instead of forcing dark mode", async () => {
  const css = await readFile(resolve(root, "apps", "evaluation-harness", "src", "styles.css"), "utf8");
  assert.match(css, /:root\[data-theme=["']light["']\]/);
  assert.doesNotMatch(css, /:root\s*\{[^}]*color-scheme:\s*dark[^}]*\}\s*$/s);
});
