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
  signal?: AbortSignal
): Promise<LiveState | null> {
  const start = performance.now();
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
