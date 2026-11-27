import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("EvidenceFlow knowledge library uses consistent document cards and an accessible upload surface", async () => {
  const markup = await readFile(resolve(root, "apps", "evidenceflow", "src", "main.tsx"), "utf8");
  const css = await readFile(resolve(root, "apps", "evidenceflow", "src", "styles.css"), "utf8");
  assert.match(markup, /className="knowledge-library"/);
  assert.match(markup, /className="library-document"/);
  assert.match(markup, /className="document-drop-input"/);
  assert.match(css, /\.knowledge-library\s*\{/);
  assert.match(css, /\.library-document\s*\{/);
  assert.match(css, /\.document-drop-input\s*\{/);
});

test("EvidenceFlow library and conversation panels use the same surface tokens", async () => {
  const css = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
  const evidence = await readFile(resolve(root, "apps", "evidenceflow", "src", "styles.css"), "utf8");
  assert.match(css, /\.chat-sidebar\s*\{[^}]*background:\s*var\(--surface\)/s);
  assert.match(evidence, /\.knowledge-library\s*\{[^}]*border:\s*1px solid var\(--border\)/s);
});
