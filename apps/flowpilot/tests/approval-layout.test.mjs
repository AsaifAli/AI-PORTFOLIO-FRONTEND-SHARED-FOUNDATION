import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/main.tsx");
const source = readFileSync(sourcePath, "utf8");

test("renders Approval Queue as its own section after standalone Run History", () => {
  const runHistoryStart = source.indexOf('02 / RUN HISTORY');
  const approvalSectionStart = source.indexOf('className="approval-section run-section"');
  const footerStart = source.indexOf('<footer className="product-footnote">');

  assert.notEqual(runHistoryStart, -1, "Run History must have its own section heading");
  assert.notEqual(approvalSectionStart, -1, "Approval Queue must start a separate section");
  assert.ok(approvalSectionStart > runHistoryStart, "Approval Queue should follow Run History");

  const runHistoryMarkup = source.slice(runHistoryStart, approvalSectionStart);
  assert.match(runHistoryMarkup, /<Panel title="Run history"/);
  assert.doesNotMatch(runHistoryMarkup, /<ApprovalQueue\b/, "Approval Queue must not be nested in Run History");

  const approvalMarkup = source.slice(approvalSectionStart, footerStart);
  assert.match(approvalMarkup, /<Panel title="Approval queue"/);
  assert.match(approvalMarkup, /<ApprovalQueue\b/, "The dedicated section must render the full approval experience");
});
