export type QuoteRecord = Record<string, unknown>;
export type QuoteAnalysis = Record<string, unknown>;

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
