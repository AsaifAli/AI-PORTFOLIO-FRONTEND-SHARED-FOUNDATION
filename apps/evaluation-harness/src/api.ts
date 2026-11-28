import {
  parseActivity,
  parseExperimentComparisons,
  parseQuality,
  parseRuntimeEvaluations,
} from "./dashboard-data.mjs";
import type {
  ActivitySnapshot,
  EvaluationProjectSlug,
  ExperimentComparisonSnapshot,
  QualitySnapshot,
  RuntimeEvaluation,
} from "./dashboard-data.mjs";

export type DashboardSnapshot = {
  quality: QualitySnapshot | null;
  activity: ActivitySnapshot | null;
  runtime: RuntimeEvaluation[] | null;
  comparisons: Partial<Record<EvaluationProjectSlug, ExperimentComparisonSnapshot | null>>;
  serviceHealthy: boolean;
  checkedAt: string;
};

async function getJson(baseUrl: string, path: string, signal: AbortSignal): Promise<unknown | null> {
  try {
    const response = await fetch(baseUrl + path, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
      signal,
    });
    if (response.status !== 200 || !(response.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return null;
    }
    const body = await response.text();
    if (!body || body.length > 1_000_000) return null;
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export async function loadExperimentComparison(
  baseUrl: string,
  target: EvaluationProjectSlug,
  baselineExperimentId: string | null,
  signal: AbortSignal,
): Promise<ExperimentComparisonSnapshot | null> {
  const query = new URLSearchParams({ target });
  if (baselineExperimentId) query.set("baseline_experiment_id", baselineExperimentId);
  const payload = await getJson(baseUrl, "/api/ai-quality/runtime-experiments?" + query.toString(), signal);
  return parseExperimentComparisons(payload);
}

/**
 * Reads only public, read-only Harness endpoints through the Studio same-origin
 * proxy. The server-side proxy strips event IDs and non-allowlisted metrics.
 */
export async function loadDashboardSnapshot(
  baseUrl = "",
  signal: AbortSignal,
): Promise<DashboardSnapshot> {
  const normalizedBase = baseUrl.trim().replace(/\/$/, "");
  const targets: EvaluationProjectSlug[] = ["evidenceflow", "quotesense", "flowpilot"];
  const [healthPayload, qualityPayload, activityPayload, runtimePayload, ...comparisonPayloads] = await Promise.all([
    getJson(normalizedBase, "/health", signal),
    getJson(normalizedBase, "/api/ai-quality?limit=200", signal),
    getJson(normalizedBase, "/api/application-summary", signal),
    getJson(normalizedBase, "/api/ai-quality/runtime?limit=100", signal),
    ...targets.map((target) =>
      getJson(normalizedBase, "/api/ai-quality/runtime-experiments?target=" + target, signal),
    ),
  ]);

  const comparisons: DashboardSnapshot["comparisons"] = {};
  targets.forEach((target, index) => {
    comparisons[target] = parseExperimentComparisons(comparisonPayloads[index]);
  });

  return {
    quality: parseQuality(qualityPayload),
    activity: parseActivity(activityPayload),
    runtime: parseRuntimeEvaluations(runtimePayload),
    comparisons,
    serviceHealthy: Boolean(
      healthPayload &&
      typeof healthPayload === "object" &&
      "status" in healthPayload &&
      healthPayload.status === "ok",
    ),
    checkedAt: new Date().toISOString(),
  };
}
