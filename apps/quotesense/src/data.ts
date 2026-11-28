export type QuoteRecord = Record<string, unknown>;
export type QuoteAnalysis = Record<string, unknown>;

export type ProcessingStageStatus = "started" | "completed" | "failed";

export type ProcessingStageEvent = {
  sequence?: number;
  stage: string;
  status: ProcessingStageStatus;
  message: string;
  occurred_at?: string | null;
  metrics?: Record<string, number | boolean>;
};

export const QUOTESENSE_PROCESSING_STAGES = [
  { id: "ingest", label: "Document intake", description: "Upload and file checks" },
  { id: "extract", label: "Structured extraction", description: "Read supplier quotation fields" },
  { id: "validation", label: "Validation", description: "Schema and completeness checks" },
  { id: "scoring", label: "Deterministic scoring", description: "Configured business rules" },
  { id: "risk_assessment", label: "Commercial risk review", description: "Missing terms and eligible anomalies" },
  { id: "analysis", label: "Comparative assessment", description: "LLM-assisted review of the validated results" },
  { id: "recommendation", label: "Recommendation", description: "Evidence-informed option for human review" },
  { id: "complete", label: "Ready for review", description: "Final result returned" },
] as const;

export function latestStageEvent(
  events: ProcessingStageEvent[],
  stage: string,
): ProcessingStageEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (events[index]?.stage === stage) return events[index];
  }
  return null;
}

export function createSampleProcessingTrace(): ProcessingStageEvent[] {
  return [
    { sequence: 1, stage: "ingest", status: "completed", message: "Three synthetic supplier quotations passed upload checks.", metrics: { document_count: 3, total_bytes: 284_100 } },
    { sequence: 2, stage: "extract", status: "completed", message: "Structured quotation fields and source references were extracted from the sample documents.", metrics: { document_index: 3, document_count: 3, quotation_count: 3, evidence_item_count: 9, extracted_field_count: 30, duration_ms: 4_820 } },
    { sequence: 3, stage: "validation", status: "completed", message: "All three structured records were checked for required procurement fields.", metrics: { quotation_count: 3, missing_field_count: 2 } },
    { sequence: 4, stage: "scoring", status: "completed", message: "Supplier scores were calculated using the configured deterministic weights.", metrics: { supplier_count: 3, scored_supplier_count: 3 } },
    { sequence: 5, stage: "risk_assessment", status: "completed", message: "Commercial terms and comparable prices were reviewed for risk signals.", metrics: { risk_finding_count: 2, price_anomaly_count: 1 } },
    { sequence: 6, stage: "analysis", status: "completed", message: "The validated quotations, score components and risk findings were compared.", metrics: {} },
    { sequence: 7, stage: "recommendation", status: "completed", message: "A qualitative recommendation and its rationale were prepared for human review.", metrics: {} },
    { sequence: 8, stage: "complete", status: "completed", message: "The synthetic example is ready to inspect.", metrics: { document_count: 3, quotation_count: 3, scored_supplier_count: 3, risk_finding_count: 2, price_anomaly_count: 1 } },
  ];
}

export function createSampleQuoteAnalysis(): QuoteAnalysis {
  const suppliers = [
    {
      supplier: "Aster Office Systems",
      total_cost: 1_240_000,
      currency: "INR",
      project_description: "Workplace equipment and installation",
      key_features: ["On-site installation", "Warranty support"],
      terms_conditions: "Net 30 days after delivery. One-year warranty.",
      validity_period: "30 days",
      delivery_timeline: "21 days",
      contact_info: "sample@example.invalid",
      warranty: "12 months",
      quote_reference: "AS-2026-041",
      quote_date: "2026-11-18",
      subtotal: 1_050_847.46,
      tax_amount: 189_152.54,
      tax_included: true,
      shipping_cost: 0,
      discount_amount: 0,
      additional_charges: 0,
      payment_terms: "Net 30 days after delivery",
      support: "Business-hours support",
      exclusions: [],
      line_items: [
        { description: "Ergonomic office chairs", quantity: 50, unit: "units", unit_price: 12000, total_price: 600000, notes: "Standard fabric finish" },
        { description: "Height-adjustable desks", quantity: 20, unit: "units", unit_price: 22542.37, total_price: 450847.46, notes: "Cable management included" },
      ],
    },
    {
      supplier: "Mango Industrial Supply",
      total_cost: 1_180_000,
      currency: "INR",
      project_description: "",
      key_features: ["Installation included", "Extended service desk"],
      terms_conditions: "40% advance; balance after acceptance. Two-year warranty.",
      validity_period: "45 days",
      delivery_timeline: "45 days",
      contact_info: "",
      warranty: "24 months",
      quote_reference: "MIS-Q-881",
      quote_date: "2026-11-20",
      subtotal: 1_000_000,
      tax_amount: 180_000,
      tax_included: true,
      shipping_cost: 0,
      discount_amount: 0,
      additional_charges: 0,
      payment_terms: "40% advance; balance after acceptance",
      support: "Two-year extended service desk",
      exclusions: [],
      line_items: [
        { description: "Ergonomic office chairs", quantity: 50, unit: "units", unit_price: 11500, total_price: 575000, notes: "Extended warranty included" },
        { description: "Height-adjustable desks", quantity: 20, unit: "units", unit_price: 21250, total_price: 425000, notes: "Cable management included" },
        { description: "Installation", quantity: 1, unit: "service", unit_price: 0, total_price: 0, notes: "Included in quoted price" },
      ],
    },
    {
      supplier: "Northstar Workplace",
      total_cost: 1_890_000,
      currency: "INR",
      project_description: "Workplace equipment supply",
      key_features: ["Standard delivery"],
      terms_conditions: "Full payment upfront. Delivery is non-cancellable.",
      validity_period: "15 days",
      delivery_timeline: "45 days",
      contact_info: "sample@example.invalid",
      warranty: "",
      quote_reference: "NW-5561",
      quote_date: "2026-11-16",
      subtotal: 1_600_000,
      tax_amount: 288_000,
      tax_included: true,
      shipping_cost: 2_000,
      discount_amount: 0,
      additional_charges: 0,
      payment_terms: "Full payment upfront",
      support: "Support not specified",
      exclusions: ["On-site installation"],
      line_items: [
        { description: "Ergonomic office chairs", quantity: 50, unit: "units", unit_price: 14000, total_price: 700000, notes: "Basic model" },
        { description: "Height-adjustable desks", quantity: 20, unit: "units", unit_price: 35000, total_price: 700000, notes: "Standard finish" },
        { description: "Delivery", quantity: 1, unit: "service", unit_price: 200000, total_price: 200000, notes: "Standard delivery" },
      ],
    },
  ];

  return {
    status: "success",
    demo_mode: true,
    documents: suppliers.map((_item, index) => ({ source: `Sample quotation ${index + 1}` })),
    quotations: suppliers.map((item) => ({
      ...item,
      evidence: [{ source: "Synthetic quotation", location: "Page 1", excerpt: "Illustrative source excerpt for this sample supplier record." }],
    })),
    validation: [
      { supplier: "Aster Office Systems", completeness_score: 100, missing_fields: [] },
      { supplier: "Mango Industrial Supply", completeness_score: 77.8, missing_fields: ["project_description", "contact_info"] },
      { supplier: "Northstar Workplace", completeness_score: 100, missing_fields: [] },
    ],
    scores: [
      { supplier: "Aster Office Systems", score: 89.4, cost_score: 53.8, completeness_score: 100, timeline_score: 88.3, terms_score: 90, risk_score: 100, currency: "INR", total_cost: 1_240_000, cost_comparable: true },
      { supplier: "Mango Industrial Supply", score: 87.8, cost_score: 100, completeness_score: 100, timeline_score: 84.4, terms_score: 90, risk_score: 90, currency: "INR", total_cost: 1_180_000, cost_comparable: true },
      { supplier: "Northstar Workplace", score: 67.2, cost_score: 0, completeness_score: 80, timeline_score: 75, terms_score: 55, risk_score: 55, currency: "INR", total_cost: 1_890_000, cost_comparable: true },
    ],
    weights: { cost: 0.4, completeness: 0.25, timeline: 0.15, terms: 0.1, risk: 0.1 },
    risks: [
      { supplier: "Northstar Workplace", level: "high", items: ["Full upfront payment is stated.", "Warranty information is missing."] },
    ],
    price_anomalies: [
      { supplier: "Northstar Workplace", total_cost: 1_390_000, median_cost: 1_240_000, deviation_percent: 52.4, direction: "high" },
    ],
    recommendation: {
      recommendations: {
        primary_recommendation: {
          supplier: "Mango Industrial Supply",
          reason: "The sample recommendation favours the longer warranty and extended service desk, despite Aster Office Systems having the highest deterministic score. Mango also has a longer delivery timeline and two incomplete fields, so review those trade-offs before deciding.",
        },
      },
    },
    evidence: [
      { source: "Aster Office Systems · sample", location: "Page 1", text: "Delivery: 21 days. Net 30 payment terms. One-year warranty included." },
      { source: "Mango Industrial Supply · sample", location: "Page 2", text: "Delivery: 45 days. Two-year warranty and extended service desk included. Installation is included." },
      { source: "Northstar Workplace · sample", location: "Page 1", text: "Full payment upfront. Warranty period not specified." },
    ],
    metrics: { document_count: 3, quotation_count: 3, pipeline_seconds: 12.4, llm_provider: "sample", llm_model: "synthetic-example" },
  };
}

export const MAX_QUOTE_FILES = 5;
export const MAX_QUOTE_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_QUOTE_TOTAL_BYTES = 100 * 1024 * 1024;
const SUPPORTED_QUOTE_EXTENSIONS = new Set(["pdf", "docx", "txt", "xlsx"]);

export function validateQuoteUploads(
  files: Array<{ name: string; size: number }>,
): string | null {
  if (!files.length) return "Add at least one supplier quotation before starting the analysis.";
  if (files.length > MAX_QUOTE_FILES) return `Select no more than ${MAX_QUOTE_FILES} files in one analysis.`;
  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!SUPPORTED_QUOTE_EXTENSIONS.has(extension)) {
      return `${file.name}: supported formats are PDF, DOCX, TXT and XLSX.`;
    }
    if (!Number.isFinite(file.size) || file.size <= 0) return `${file.name}: the file is empty or has an invalid size.`;
    if (file.size > MAX_QUOTE_FILE_BYTES) return `${file.name}: each file must be 50 MB or smaller.`;
  }
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_QUOTE_TOTAL_BYTES) return "The combined upload size must be 100 MB or smaller.";
  return null;
}

export function asRecords(value: unknown): QuoteRecord[] {
  return Array.isArray(value) ? value.filter((item): item is QuoteRecord => typeof item === "object" && item !== null && !Array.isArray(item)) : [];
}

export function scoreNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getAnalysisView(result: QuoteAnalysis) {
  const quotations = asRecords(result.quotations);
  const scores = asRecords(result.scores);
  const validationSource = result.validation;
  const validation = asRecords(Array.isArray(validationSource) ? validationSource : (validationSource as QuoteRecord | undefined)?.validation);
  const risks = asRecords(result.risks);
  const evidence = asRecords(result.evidence);
  const deterministicLeader = scores[0] ?? null;
  const primary = ((result.recommendation as QuoteRecord | undefined)?.recommendations as QuoteRecord | undefined)?.primary_recommendation as QuoteRecord | undefined;
  const comparisonMatrix = typeof result.comparison_matrix === "object" && result.comparison_matrix !== null && !Array.isArray(result.comparison_matrix)
    ? result.comparison_matrix as QuoteRecord
    : {};
  const rawWeights = result.weights;
  const weights: Record<string, number> = {};
  if (typeof rawWeights === "object" && rawWeights !== null && !Array.isArray(rawWeights)) {
    for (const [key, value] of Object.entries(rawWeights)) {
      const parsed = scoreNumber(value);
      if (parsed !== null) weights[key] = parsed;
    }
  }
  const completeness = validation.map((row) => scoreNumber(row.completeness_score)).filter((value): value is number => value !== null && value >= 0 && value <= 100);
  const averageCompleteness = completeness.length ? completeness.reduce((sum, value) => sum + value, 0) / completeness.length : null;
  const deterministicSupplier = String(deterministicLeader?.supplier || "").trim();
  const qualitativeSupplier = String(primary?.supplier || "").trim();
  const recommendationDiffers = Boolean(qualitativeSupplier && deterministicSupplier && qualitativeSupplier.toLowerCase() !== deterministicSupplier.toLowerCase());
  return {
    quotations,
    scores,
    comparisonMatrix,
    validation,
    risks,
    evidence,
    weights,
    deterministicLeader,
    primaryRecommendation: primary ?? null,
    deterministicSupplier,
    qualitativeSupplier,
    recommendationDiffers,
    averageCompleteness,
    bestScore: scoreNumber(deterministicLeader?.score),
  };
}

export function toSupplierCsv(result: QuoteAnalysis): string {
  const view = getAnalysisView(result);
  const quoteMap = new Map(view.quotations.map((quote) => [String(quote.supplier || quote.vendor || "Unknown supplier").toLowerCase(), quote]));
  const rows = [["Rank", "Supplier", "Score", "Currency", "Total cost", "Timeline", "Validity", "Cost comparable"]];
  view.scores.forEach((score, index) => {
    const supplier = String(score.supplier || "Unknown supplier");
    const quote = quoteMap.get(supplier.toLowerCase()) ?? {};
    rows.push([
      String(index + 1), supplier, scoreNumber(score.score)?.toFixed(1) ?? "",
      String(quote.currency || ""), String(quote.total_cost || ""),
      String(quote.delivery_timeline || ""), String(quote.validity_period || ""),
      score.cost_comparable === false ? "no" : "yes",
    ]);
  });
  return rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\r\n");
}


export const DEFAULT_SCORING_WEIGHTS: Record<string, number> = {
  cost: 40,
  completeness: 25,
  timeline: 15,
  terms: 10,
  risk: 10,
};

export function getProcurementComparison(result: QuoteAnalysis) {
  const view = getAnalysisView(result);
  const matrix = view.comparisonMatrix;
  let suppliers = asRecords(matrix.suppliers);
  const lineItemsFromApi = asRecords(matrix.line_items);
  let pricing = asRecords(matrix.pricing_reconciliation);
  if (!pricing.length) {
    pricing = view.quotations.map((quote) => {
      const subtotal = scoreNumber(quote.subtotal);
      const total = scoreNumber(quote.total_cost);
      const tax = scoreNumber(quote.tax_amount);
      const shipping = scoreNumber(quote.shipping_cost);
      const discount = scoreNumber(quote.discount_amount);
      const other = scoreNumber(quote.additional_charges);
      const reported = [tax, shipping, discount, other].filter((value) => value !== null);
      const complete = subtotal !== null && total !== null
        && tax !== null && shipping !== null && discount !== null && other !== null;
      const calculated = subtotal !== null && reported.length
        ? subtotal + (tax ?? 0) + (shipping ?? 0) - (discount ?? 0) + (other ?? 0)
        : null;
      const difference = calculated !== null && total !== null ? Number((total - calculated).toFixed(2)) : null;
      return {
        supplier: quote.supplier,
        currency: quote.currency,
        subtotal,
        tax_amount: tax,
        shipping_cost: shipping,
        discount_amount: discount,
        additional_charges: other,
        stated_total: total,
        calculated_total_from_reported_components: calculated,
        difference,
        status: complete
          ? Math.abs(difference ?? 0) <= Math.max(1, Math.abs(total ?? 0) * 0.01) ? "matched" : "review"
          : reported.length && subtotal !== null && total !== null ? "partial_check" : "insufficient_data",
      };
    });
  }

  if (!suppliers.length) {
    const scoreMap = new Map(view.scores.map((score) => [
      String(score.supplier || "").trim().toLowerCase(),
      score,
    ]));
    suppliers = view.quotations.map((quote, index) => {
      const supplier = String(quote.supplier || quote.vendor || `Quotation ${index + 1}`);
      const score = scoreMap.get(supplier.trim().toLowerCase()) || {};
      return {
        supplier,
        source_document: quote.source_document,
        total_cost: quote.total_cost,
        currency: quote.currency,
        score: score.score,
        price_difference_from_lowest: null,
        percent_above_lowest: null,
        delivery_timeline: quote.delivery_timeline,
        payment_terms: quote.payment_terms || quote.terms_conditions,
        warranty: quote.warranty,
        support: quote.support,
        validity_period: quote.validity_period,
        tax_amount: quote.tax_amount,
        tax_included: quote.tax_included,
        shipping_cost: quote.shipping_cost,
        discount_amount: quote.discount_amount,
        additional_charges: quote.additional_charges,
        exclusions: quote.exclusions,
        line_item_count: asRecords(quote.line_items).length,
      };
    });
  }

  let lineItems = lineItemsFromApi;
  if (!lineItems.length) {
    const grouped = new Map<string, QuoteRecord>();
    for (const quote of view.quotations) {
      const supplier = String(quote.supplier || quote.vendor || "Unknown supplier");
      for (const item of asRecords(quote.line_items)) {
        const description = String(item.description || "").trim();
        const key = description.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!key) continue;
        if (!grouped.has(key)) grouped.set(key, { description, offers: [], not_listed_by: [] });
        const group = grouped.get(key)!;
        const offers = asRecords(group.offers);
        offers.push({
          supplier,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes,
          currency: quote.currency,
          source_document: quote.source_document,
        });
        group.offers = offers;
      }
    }
    lineItems = [...grouped.values()].map((group) => {
      const offers = asRecords(group.offers);
      const offered = new Set(offers.map((offer) => String(offer.supplier)));
      return {
        ...group,
        not_listed_by: suppliers
          .map((item) => String(item.supplier || "Unknown supplier"))
          .filter((supplier) => !offered.has(supplier)),
        unit_price_comparable: offers.filter((offer) => scoreNumber(offer.unit_price) !== null).length >= 2
          && new Set(offers.filter((offer) => scoreNumber(offer.unit_price) !== null).map((offer) => String(offer.unit || "").toLowerCase()).filter(Boolean)).size === 1
          && new Set(offers.filter((offer) => scoreNumber(offer.unit_price) !== null).map((offer) => String(offer.currency || "").toUpperCase())).size === 1,
      };
    });
  }

  const knownCurrencies = new Set(suppliers
    .filter((supplier) => scoreNumber(supplier.total_cost) !== null)
    .map((supplier) => String(supplier.currency || "").trim().toUpperCase()));
  const pricedCount = suppliers.filter((supplier) => scoreNumber(supplier.total_cost) !== null).length;
  const fallbackComparable = pricedCount >= 2
    && knownCurrencies.size === 1
    && !knownCurrencies.has("");
  const currencyComparable = typeof matrix.cost_comparable === "boolean"
    ? matrix.cost_comparable
    : fallbackComparable;
  const cheapest = currencyComparable
    ? [...suppliers].filter((supplier) => scoreNumber(supplier.total_cost) !== null)
      .sort((a, b) => (scoreNumber(a.total_cost) ?? Infinity) - (scoreNumber(b.total_cost) ?? Infinity))[0]
    : undefined;
  return {
    suppliers,
    lineItems,
    pricing,
    currencyComparable,
    currency: typeof matrix.currency === "string" ? matrix.currency : knownCurrencies.size === 1 ? [...knownCurrencies][0] : null,
    comparabilityReason: String(matrix.cost_comparability_reason || (currencyComparable
      ? "Supplier totals use a shared currency."
      : "Cost comparison is unavailable until at least two priced quotations with the same explicit currency are available.")),
    lowestPriceSupplier: String(matrix.lowest_price_supplier || cheapest?.supplier || ""),
    lowestPrice: scoreNumber(matrix.lowest_price) ?? scoreNumber(cheapest?.total_cost),
  };
}

function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

export function toComparisonCsv(result: QuoteAnalysis): string {
  const comparison = getProcurementComparison(result);
  const rows: string[][] = [];
  rows.push(["SUPPLIER COMPARISON"]);
  rows.push(["Supplier", "Source document", "Currency", "Quoted total", "Score", "Difference from lowest", "% above lowest", "Delivery", "Payment terms", "Warranty", "Support", "Validity", "Tax amount", "Tax included", "Shipping", "Discount", "Additional charges", "Listed exclusions"]);
  for (const item of comparison.suppliers) {
    rows.push([
      String(item.supplier || ""),
      String(item.source_document || ""),
      String(item.currency || ""),
      String(item.total_cost ?? ""),
      String(item.score ?? ""),
      String(item.price_difference_from_lowest ?? ""),
      String(item.percent_above_lowest ?? ""),
      String(item.delivery_timeline || ""),
      String(item.payment_terms || ""),
      String(item.warranty || ""),
      String(item.support || ""),
      String(item.validity_period || ""),
      String(item.tax_amount ?? ""),
      String(item.tax_included ?? ""),
      String(item.shipping_cost ?? ""),
      String(item.discount_amount ?? ""),
      String(item.additional_charges ?? ""),
      Array.isArray(item.exclusions) ? item.exclusions.join("; ") : String(item.exclusions || ""),
    ]);
  }
  rows.push([]);
  rows.push(["ITEMIZED COMPARISON"]);
  rows.push(["Line item", "Supplier", "Quantity", "Unit", "Unit price", "Line total", "Currency", "Notes"]);
  for (const group of comparison.lineItems) {
    const offers = asRecords(group.offers);
    for (const offer of offers) {
      rows.push([
        String(group.description || ""),
        String(offer.supplier || ""),
        String(offer.quantity ?? ""),
        String(offer.unit || ""),
        String(offer.unit_price ?? ""),
        String(offer.total_price ?? ""),
        String(offer.currency || ""),
        String(offer.notes || ""),
      ]);
    }
    for (const supplier of Array.isArray(group.not_listed_by) ? group.not_listed_by : []) {
      rows.push([String(group.description || ""), String(supplier), "", "", "", "", "", "Not listed in this quotation"]);
    }
  }
  rows.push([]);
  rows.push(["PRICING RECONCILIATION"]);
  rows.push(["Supplier", "Subtotal", "Tax", "Shipping", "Discount", "Other charges", "Stated total", "Calculated total", "Difference", "Status"]);
  for (const item of comparison.pricing) {
    rows.push([
      String(item.supplier || ""),
      String(item.subtotal ?? ""),
      String(item.tax_amount ?? ""),
      String(item.shipping_cost ?? ""),
      String(item.discount_amount ?? ""),
      String(item.additional_charges ?? ""),
      String(item.stated_total ?? ""),
      String(item.calculated_total_from_reported_components ?? ""),
      String(item.difference ?? ""),
      String(item.status || ""),
    ]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
