import {
  LiveState,
  Incident,
  School,
  ArchitectureData,
  SecurityData,
  PerformanceData,
  DeploymentData,
  RiskMatrixData,
  IntegrationData,
} from "./types";
import { scenarioBasePath, ScenarioId } from "./demoConfig";
import * as logger from "./logger";
import { recordFetch } from "./metrics";

export async function loadSchools(
  scenario: ScenarioId = "normal",
  signal?: AbortSignal
): Promise<School[]> {
  const start = performance.now();
  try {
    const res = await fetch(`${scenarioBasePath(scenario)}/schools.json`, { signal });
    if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
    const data = (await res.json()) as School[];
    recordFetch(performance.now() - start, true);
    return data;
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      logger.error("loadSchools failed", err);
      recordFetch(performance.now() - start, false);
    }
    return [];
  }
}

export async function loadLiveState(
  snapshot: string,
  scenario: ScenarioId = "normal",
  signal?: AbortSignal,
  city?: string,
  weather?: string,
  dataMode?: "live" | "demo"
): Promise<LiveState | null> {
  const start = performance.now();

  // If an AWS Snapshot API URL is configured and we're not in demo mode, use live data.
  const awsApiUrl = process.env.NEXT_PUBLIC_AWS_SNAPSHOT_API_URL;
  if (awsApiUrl && dataMode !== "demo") {
    try {
      const params = new URLSearchParams();
      if (city)    params.set("city",    city);
      if (weather) params.set("weather", weather);
      // For non-Springfield cities the model is time-based; simulate dismissal
      // hour (14:30 UTC ≈ 3 PM dismissal) so scores are realistic off-hours
      if (city && city !== "springfield_il") params.set("sim_hour", "15");
      const url = params.size > 0 ? `${awsApiUrl}?${params}` : awsApiUrl;
      const res = await fetch(url, { signal, cache: "no-store" });
      if (!res.ok) throw new Error(`AWS snapshot API returned ${res.status}`);
      const data = (await res.json()) as LiveState;
      recordFetch(performance.now() - start, true);
      logger.info(`Loaded live snapshot from AWS API (city=${city ?? "default"})`);
      return data;
    } catch (err) {
      if ((err as Error).name === "AbortError") return null;
      logger.warn("AWS snapshot API failed, falling back to mock data:", err);
      // Fall through to mock data below
    }
  }

  // Default: load from static mock JSON files (demo mode)
  try {
    const res = await fetch(`${scenarioBasePath(scenario)}/${snapshot}`, { signal });
    if (!res.ok) throw new Error(`Failed to load live state: ${res.status}`);
    const data = (await res.json()) as LiveState;
    recordFetch(performance.now() - start, true);
    logger.info(`Loaded snapshot ${snapshot} (${scenario})`);
    return data;
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      logger.error("loadLiveState failed", err);
      recordFetch(performance.now() - start, false);
    }
    return null;
  }
}

export async function loadIncidents(
  scenario: ScenarioId = "normal",
  signal?: AbortSignal
): Promise<{ data: Incident[]; error: string | null }> {
  const start = performance.now();
  try {
    const res = await fetch(`${scenarioBasePath(scenario)}/incidents.json`, { signal });
    if (!res.ok) throw new Error(`Failed to load incidents: ${res.status}`);
    const data = (await res.json()) as Incident[];
    recordFetch(performance.now() - start, true);
    return { data, error: null };
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      logger.error("loadIncidents failed", err);
      recordFetch(performance.now() - start, false);
    }
    return { data: [], error: "Demo Data Unavailable" };
  }
}

// ---------------------------------------------------------------------------
// Procurement Pack Loaders
// ---------------------------------------------------------------------------

type ProcurementPayload =
  | ArchitectureData
  | SecurityData
  | PerformanceData
  | DeploymentData
  | RiskMatrixData
  | IntegrationData;

export async function loadProcurementData<T extends ProcurementPayload>(
  file: string,
  signal?: AbortSignal
): Promise<{ data: T | null; error: string | null }> {
  const start = performance.now();
  try {
    const res = await fetch(`/mock/procurement/${file}`, { signal });
    if (!res.ok) throw new Error(`Failed to load procurement/${file}: ${res.status}`);
    const data = (await res.json()) as T;
    recordFetch(performance.now() - start, true);
    logger.info(`Loaded procurement/${file}`);
    return { data, error: null };
  } catch (err) {
    if ((err as Error).name !== "AbortError") {
      logger.error(`loadProcurementData(${file}) failed`, err);
      recordFetch(performance.now() - start, false);
    }
    return { data: null, error: "Procurement data unavailable" };
  }
}
