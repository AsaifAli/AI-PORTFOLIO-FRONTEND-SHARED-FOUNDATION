import assert from "node:assert/strict";
import test from "node:test";
import { getAnalysisView, scoreNumber, toSupplierCsv, validateQuoteUploads } from "../src/data.ts";

test("normalizes comparison, validation and qualitative recommendation separately", () => {
  const view = getAnalysisView({
    quotations: [{ supplier: "North", total_cost: "100", currency: "USD" }],
    scores: [{ supplier: "North", score: 82.5, cost_comparable: false }],
    validation: { validation: [{ completeness_score: 90 }] },
    recommendation: { recommendations: { primary_recommendation: { supplier: "South", reason: "Better delivery terms" } } },
    risks: [{ severity: "high" }],
  });
  assert.equal(view.bestScore, 82.5);
  assert.equal(view.averageCompleteness, 90);
  assert.equal(view.deterministicSupplier, "North");
  assert.equal(view.qualitativeSupplier, "South");
  assert.equal(view.recommendationDiffers, true);
  assert.equal(view.risks.length, 1);
});

test("CSV escapes commas, quotes and line breaks safely", () => {
  const csv = toSupplierCsv({ scores: [{ supplier: 'North, "A"', score: 99 }], quotations: [] });
  assert.ok(csv.includes('"North, ""A"""'));
});

test("non-finite scores are never shown as valid numeric scores", () => {
  assert.equal(scoreNumber("NaN"), null);
  assert.equal(scoreNumber(Infinity), null);
  assert.equal(scoreNumber("82.4"), 82.4);
});


test("enforces the QuoteSense upload contract before making a request", () => {
  assert.equal(validateQuoteUploads([{ name: "quote.pdf", size: 1024 }]), null);
  assert.match(validateQuoteUploads([]) || "", /at least one/i);
  assert.match(validateQuoteUploads([{ name: "quote.exe", size: 100 }]) || "", /supported formats/i);
  assert.match(validateQuoteUploads([{ name: "large.pdf", size: 51 * 1024 * 1024 }]) || "", /50 MB/i);
  assert.match(validateQuoteUploads([
    { name: "one.pdf", size: 50 * 1024 * 1024 },
    { name: "two.xlsx", size: 50 * 1024 * 1024 },
    { name: "three.txt", size: 1 },
  ]) || "", /100 MB/i);
  assert.match(validateQuoteUploads(Array.from({ length: 6 }, (_, index) => ({ name: `q${index}.pdf`, size: 100 }))) || "", /no more than 5/i);
});


test("processing stage selection uses the latest real event for each stage", async () => {
  const { latestStageEvent, QUOTESENSE_PROCESSING_STAGES } = await import("../src/data.ts");
  const events = [
    { stage: "extract", status: "started", message: "Reading first quotation." },
    { stage: "extract", status: "completed", message: "First quotation extracted." },
    { stage: "extract", status: "started", message: "Reading second quotation." },
  ];
  assert.equal(latestStageEvent(events, "extract")?.status, "started");
  assert.equal(latestStageEvent(events, "extract")?.message, "Reading second quotation.");
  assert.equal(latestStageEvent(events, "recommendation"), null);
  assert.equal(QUOTESENSE_PROCESSING_STAGES.length, 8);
});

test("sample walkthrough is explicitly synthetic and keeps deterministic ranking separate from recommendation", async () => {
  const { createSampleQuoteAnalysis, createSampleProcessingTrace, getAnalysisView } = await import("../src/data.ts");
  const sample = createSampleQuoteAnalysis();
  const view = getAnalysisView(sample);
  assert.equal(sample.demo_mode, true);
  assert.equal(view.deterministicSupplier, "Aster Office Systems");
  assert.equal(view.qualitativeSupplier, "Mango Industrial Supply");
  assert.equal(view.recommendationDiffers, true);
  assert.equal(view.weights.cost, 0.4);
  assert.equal(createSampleProcessingTrace().length, 8);
});
