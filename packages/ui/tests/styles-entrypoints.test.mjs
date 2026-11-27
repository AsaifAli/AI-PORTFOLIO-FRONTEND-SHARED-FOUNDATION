import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const activeWorkspaces = ["evidenceflow", "quotesense", "flowpilot", "evaluation-harness"];
const themeScopes = {
  evidenceflow: ".app-evidenceflow",
  quotesense: ".app-quotesense",
  flowpilot: ".app-flowpilot",
  "evaluation-harness": ".evaluation-app",
};

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

for (const workspace of activeWorkspaces) {
  test(`${workspace} defines an explicit product accent and primary action gradient`, async () => {
    const stylesheet = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
    const selector = themeScopes[workspace].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rule = stylesheet.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
    assert.ok(rule, `Missing theme scope for ${workspace}`);
    assert.match(rule[1], /--accent:\s*#[0-9a-f]{6}/i);
    assert.match(rule[1], /--primary-gradient:/);
    assert.match(rule[1], /--focus-ring:/);
  });
}

test("shared primary controls preserve a comfortable touch target", async () => {
  const stylesheet = await readFile(resolve(root, "packages", "ui", "src", "styles.css"), "utf8");
  const buttonRules = [...stylesheet.matchAll(/\.btn\s*\{([^}]*)\}/g)];
  assert.ok(buttonRules.some(([, declarations]) => /min-height:\s*40px/.test(declarations)));
  const deleteRules = [...stylesheet.matchAll(/\.chat-delete\s*\{([^}]*)\}/g)];
  assert.ok(deleteRules.some(([, declarations]) => /min-width:\s*32px/.test(declarations)));
});
