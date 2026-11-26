import { parseActivity, parseQuality } from "./dashboard-data.mjs";
import type { ActivitySnapshot, QualitySnapshot } from "./dashboard-data.mjs";

export type DashboardSnapshot = {
  quality: QualitySnapshot | null;
  activity: ActivitySnapshot | null;
  serviceHealthy: boolean;
  checkedAt: string;
};

async function getJson(baseUrl: string, path: string, signal: AbortSignal): Promise<unknown | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
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

/**
 * Reads only public, read-only Harness endpoints. The app defaults to same-origin
 * URLs so it can be served by the existing Harness API service without CORS.
 */
export async function loadDashboardSnapshot(
  baseUrl = "",
  signal: AbortSignal,
): Promise<DashboardSnapshot> {
  const normalizedBase = baseUrl.trim().replace(/\/$/, "");
  const [healthPayload, qualityPayload, activityPayload] = await Promise.all([
    getJson(normalizedBase, "/health", signal),
    getJson(normalizedBase, "/api/ai-quality?limit=200", signal),
    getJson(normalizedBase, "/api/application-summary", signal),
  ]);

  return {
    quality: parseQuality(qualityPayload),
    activity: parseActivity(activityPayload),
    serviceHealthy: Boolean(
      healthPayload &&
      typeof healthPayload === "object" &&
      "status" in healthPayload &&
      healthPayload.status === "ok",
    ),
    checkedAt: new Date().toISOString(),
  };
}
