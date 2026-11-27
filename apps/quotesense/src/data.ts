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
    },
    {
      supplier: "Mango Industrial Supply",
      total_cost: 1_180_000,
      currency: "INR",
      project_description: "Workplace equipment and installation",
      key_features: ["Installation included", "Extended service desk"],
      terms_conditions: "40% advance; balance after acceptance. Two-year warranty.",
      validity_period: "45 days",
      delivery_timeline: "28 days",
      contact_info: "sample@example.invalid",
      warranty: "24 months",
    },
    {
      supplier: "Northstar Workplace",
      total_cost: 1_390_000,
      currency: "INR",
      project_description: "Workplace equipment supply",
      key_features: ["Standard delivery"],
      terms_conditions: "Full payment upfront. Warranty terms not specified.",
      validity_period: "15 days",
      delivery_timeline: "45 days",
      contact_info: "sample@example.invalid",
      warranty: "",
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
      { supplier: "Mango Industrial Supply", completeness_score: 100, missing_fields: [] },
      { supplier: "Northstar Workplace", completeness_score: 80, missing_fields: ["warranty"] },
    ],
    scores: [
      { supplier: "Aster Office Systems", score: 89.4, cost_score: 53.8, completeness_score: 100, timeline_score: 88.3, terms_score: 90, risk_score: 100, currency: "INR", total_cost: 1_240_000, cost_comparable: true },
      { supplier: "Mango Industrial Supply", score: 87.8, cost_score: 100, completeness_score: 100, timeline_score: 84.4, terms_score: 90, risk_score: 90, currency: "INR", total_cost: 1_180_000, cost_comparable: true },
      { supplier: "Northstar Workplace", score: 67.2, cost_score: 0, completeness_score: 80, timeline_score: 75, terms_score: 55, risk_score: 55, currency: "INR", total_cost: 1_390_000, cost_comparable: true },
    ],
    weights: { cost: 0.4, completeness: 0.25, timeline: 0.15, terms: 0.1, risk: 0.1 },
    risks: [
      { supplier: "Northstar Workplace", level: "high", items: ["Full upfront payment is stated.", "Warranty information is missing."] },
    ],
    price_anomalies: [
      { supplier: "Northstar Workplace", total_cost: 1_390_000, median_cost: 1_240_000, deviation_percent: 12.1, direction: "high" },
    ],
    recommendation: {
      recommendations: {
        primary_recommendation: {
          supplier: "Mango Industrial Supply",
          reason: "The sample recommendation favours the stronger warranty and service coverage, despite Aster Office Systems having the highest deterministic score. Review the trade-off before making a supplier decision.",
        },
      },
    },
    evidence: [
      { source: "Aster Office Systems · sample", location: "Page 1", text: "Delivery: 21 days. Net 30 payment terms. One-year warranty included." },
      { source: "Mango Industrial Supply · sample", location: "Page 2", text: "Delivery: 28 days. Two-year warranty and extended service desk included." },
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
  const rawWeights = result.weights;
  const weights = typeof rawWeights === "object" && rawWeights !== null && !Array.isArray(rawWeights)
    ? Object.fromEntries(Object.entries(rawWeights).map(([key, value]) => [key, scoreNumber(value)]).filter((item): item is [string, number] => item[1] !== null))
    : {};
  const completeness = validation.map((row) => scoreNumber(row.completeness_score)).filter((value): value is number => value !== null && value >= 0 && value <= 100);
  const averageCompleteness = completeness.length ? completeness.reduce((sum, value) => sum + value, 0) / completeness.length : null;
  const deterministicSupplier = String(deterministicLeader?.supplier || "").trim();
  const qualitativeSupplier = String(primary?.supplier || "").trim();
  const recommendationDiffers = Boolean(qualitativeSupplier && deterministicSupplier && qualitativeSupplier.toLowerCase() !== deterministicSupplier.toLowerCase());
  return {
    quotations,
    scores,
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
