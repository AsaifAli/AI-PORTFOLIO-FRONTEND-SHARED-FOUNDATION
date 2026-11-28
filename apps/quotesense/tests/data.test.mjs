import assert from "node:assert/strict";
import test from "node:test";
import { getAnalysisView, getProcurementComparison, scoreNumber, toComparisonCsv, toSupplierCsv, validateQuoteUploads } from "../src/data.ts";

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


test("builds a side-by-side procurement comparison and marks absent line items honestly", () => {
  const result = {
    quotations: [
      {
        supplier: "Alpha",
        source_document: "alpha.pdf",
        currency: "INR",
        total_cost: 100,
        subtotal: 90,
        tax_amount: 10,
        tax_included: true,
        shipping_cost: 0,
        discount_amount: 0,
        additional_charges: 0,
        line_items: [
          { description: "Industrial printer", quantity: 2, unit: "units", unit_price: 45, total_price: 90 },
        ],
      },
      {
        supplier: "Beta",
        source_document: "beta.pdf",
        currency: "INR",
        total_cost: 120,
        subtotal: 100,
        tax_amount: 20,
        tax_included: true,
        shipping_cost: 0,
        discount_amount: 0,
        additional_charges: 0,
        line_items: [
          { description: "Industrial printer", quantity: 2, unit: "units", unit_price: 50, total_price: 100 },
          { description: "Installation", quantity: 1, unit: "service", unit_price: 0, total_price: 0 },
        ],
      },
    ],
    scores: [
      { supplier: "Beta", score: 80, cost_comparable: true },
      { supplier: "Alpha", score: 90, cost_comparable: true },
    ],
  };
  const comparison = getProcurementComparison(result);
  assert.equal(comparison.currencyComparable, true);
  assert.equal(comparison.lowestPriceSupplier, "Alpha");
  assert.equal(comparison.lowestPrice, 100);
  assert.equal(comparison.suppliers.find((item) => item.supplier === "Beta")?.price_difference_from_lowest, 20);
  assert.equal(comparison.suppliers.find((item) => item.supplier === "Beta")?.percent_above_lowest, 20);
  const printer = comparison.lineItems.find((item) => item.description === "Industrial printer");
  assert.equal(printer?.unit_price_comparable, true);
  assert.equal(printer?.lowest_unit_price, undefined);
  const installation = comparison.lineItems.find((item) => item.description === "Installation");
  assert.deepEqual(installation?.not_listed_by, ["Alpha"]);
  assert.equal(comparison.pricing[0]?.status, "matched");
  const csv = toComparisonCsv(result);
  assert.match(csv, /Not listed in this quotation/);
  assert.match(csv, /PRICING RECONCILIATION/);
});

test("does not compare totals with missing or mixed currency and does not assume missing components are zero", () => {
  const comparison = getProcurementComparison({
    quotations: [
      { supplier: "Alpha", total_cost: 100, currency: "INR", subtotal: 90, tax_amount: 10 },
      { supplier: "Beta", total_cost: 110, currency: "USD", subtotal: 100, tax_amount: 10 },
    ],
    scores: [],
  });
  assert.equal(comparison.currencyComparable, false);
  assert.equal(comparison.lowestPriceSupplier, "");
  assert.equal(comparison.suppliers.every((item) => item.price_difference_from_lowest === null), true);
  assert.equal(comparison.pricing.every((item) => item.status === "partial_check"), true);
});

test("sample procurement comparison includes itemized scope, commercial terms and price deltas", async () => {
  const { createSampleQuoteAnalysis, getProcurementComparison } = await import("../src/data.ts");
  const comparison = getProcurementComparison(createSampleQuoteAnalysis());
  assert.equal(comparison.suppliers.length, 3);
  assert.equal(comparison.lineItems.length >= 3, true);
  assert.equal(comparison.lowestPriceSupplier, "Mango Industrial Supply");
  assert.equal(comparison.currencyComparable, true);
  assert.ok(comparison.suppliers.some((supplier) => supplier.warranty === "24 months"));
});
