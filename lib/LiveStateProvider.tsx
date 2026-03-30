"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  LiveState,
  Recommendation,
  RiskLevel,
  SnapshotPhase,
  deriveRiskLevel,
} from "./types";
import type { StoredIntervention } from "./interventionStore";
import { supabase } from "./supabase";
import { loadLiveState } from "./data";
import {
  nextSnapshotPhase,
  snapshotFile,
  applyDemoIntervention,
  mergeSnapshotWithOverrides,
  applyScenarioOverlay,
} from "./stateMachine";
import { useDemoConfig, ScenarioId, DataMode, WeatherMode } from "./demoConfig";
import { validateLiveState, ValidationResult } from "./validate";
import { recordRotation } from "./metrics";
import * as logger from "./logger";

export type SyncStatus = "connecting" | "live" | "disconnected";

interface LiveStateContextValue {
  liveState: LiveState | null;
  loading: boolean;
  error: string | null;
  lastValidation: ValidationResult | null;
  applyDemo: (zoneId: string, recommendation: Recommendation) => void;
  simulateIncident: (zoneId: string) => void;
  syncStatus: SyncStatus;
  appliedHistory: StoredIntervention[];
  simulatedZones: Set<string>;
}

const LiveStateContext = createContext<LiveStateContextValue>({
  liveState: null,
  loading: true,
  error: null,
  lastValidation: null,
  applyDemo: () => {},
  simulateIncident: () => {},
  syncStatus: "connecting",
  appliedHistory: [],
  simulatedZones: new Set<string>(),
});

export function useLiveStateContext(): LiveStateContextValue {
  return useContext(LiveStateContext);
}

interface SupabaseRow {
  id: string;
  zone_id: string;
  recommendation: Recommendation;
  applied_at: string;
}

function rowToStored(row: SupabaseRow): StoredIntervention {
  return {
    zoneId: row.zone_id,
    recommendation: row.recommendation,
    appliedAt: new Date(row.applied_at).getTime(),
  };
}

function replayInterventions(
  base: LiveState,
  prev: LiveState | null,
  stored: StoredIntervention[]
): LiveState {
  let state = prev ?? base;
  for (const s of stored) state = applyDemoIntervention(state, s.zoneId, s.recommendation);
  return state;
}

export function LiveStateProvider({ children }: { children: ReactNode }) {
  const { config } = useDemoConfig();
  const [baseState, setBaseState] = useState<LiveState | null>(null);
  const [demoState, setDemoState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [appliedHistory, setAppliedHistory] = useState<StoredIntervention[]>([]);
  const phaseRef = useRef<SnapshotPhase>(SnapshotPhase.INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const baseStateRef = useRef<LiveState | null>(null);
  const optimisticIds = useRef<Set<string>>(new Set());
  const pendingSnapshotRef = useRef<StoredIntervention[]>([]);

  const fetchSnapshot = useCallback(async (phase: SnapshotPhase, scenario: ScenarioId, validate: boolean, dataMode: DataMode, city: string, weather: WeatherMode) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const file = snapshotFile(phase);
      const data = await loadLiveState(file, scenario, controller.signal, city, weather, dataMode);
      if (controller.signal.aborted) return;

      if (data) {
        // Apply scenario multipliers on top of live Lambda data.
        // Demo mode uses pre-baked scenario files so no overlay needed.
        const overlaid = dataMode === "live" ? applyScenarioOverlay(data, scenario) : data;
        if (validate) {
          const result = validateLiveState(overlaid);
          setLastValidation(result);
          if (!result.valid) logger.warn("Snapshot validation failed", result.errors);
        }
        setBaseState(overlaid);
        setError(null);
        recordRotation();
      } else {
        setError("Demo Data Unavailable");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Demo Data Unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialPhase = nextSnapshotPhase(phaseRef.current);
    phaseRef.current = initialPhase;
    fetchSnapshot(initialPhase, config.scenario, config.runtimeValidationEnabled, config.dataMode, config.selectedCity, config.weather);

    if (config.timeMode === "paused") return;

    const interval = setInterval(() => {
      const next = nextSnapshotPhase(phaseRef.current);
      phaseRef.current = next;
      fetchSnapshot(next, config.scenario, config.runtimeValidationEnabled, config.dataMode, config.selectedCity, config.weather);
    }, config.snapshotIntervalMs);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchSnapshot, config.scenario, config.timeMode, config.snapshotIntervalMs, config.runtimeValidationEnabled, config.dataMode, config.selectedCity, config.weather]);

  // Mirror baseState into ref and flush pending interventions
  const prevHighZones = useRef<Set<string>>(new Set());
  useEffect(() => {
    baseStateRef.current = baseState;
    if (baseState && pendingSnapshotRef.current.length > 0) {
      const pending = pendingSnapshotRef.current;
      pendingSnapshotRef.current = [];
      setDemoState((prev) => replayInterventions(baseState, prev, pending));
    }

    // Send push notification for newly HIGH-risk zones (transitions only)
    if (baseState && config.dataMode === "live") {
      const currentHigh = new Set(baseState.zones.filter((z) => z.risk_level === "HIGH").map((z) => z.zone_id));
      Array.from(currentHigh).forEach((zoneId) => {
        if (!prevHighZones.current.has(zoneId)) {
          const zone = baseState.zones.find((z) => z.zone_id === zoneId);
          fetch("/api/push/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "HIGH Risk Zone Alert",
              body: `${zone?.name ?? zoneId} has reached HIGH risk — immediate attention required.`,
              severity: "critical",
              zoneId,
              url: "/operations/dashboard",
            }),
          }).catch(() => {/* non-critical */});
        }
      });
      prevHighZones.current = currentHigh;
    }
  }, [baseState, config.dataMode]);

  // Supabase Realtime subscription
  useEffect(() => {
    if (!config.demoMutationEnabled) return;

    setSyncStatus("connecting");

    // Fetch existing interventions as initial snapshot
    supabase
      .from("interventions")
      .select("*")
      .order("applied_at", { ascending: true })
      .then(({ data }) => {
        if (!data) return;
        const stored = (data as SupabaseRow[]).map(rowToStored);
        setAppliedHistory(stored);
        setDemoState((prev) => {
          const base = baseStateRef.current;
          if (!base) { pendingSnapshotRef.current = stored; return prev; }
          return replayInterventions(base, prev, stored);
        });
      });

    // Subscribe to new inserts via Realtime
    const channel = supabase
      .channel("interventions-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "interventions" },
        (payload) => {
          const item = rowToStored(payload.new as SupabaseRow);
          // Skip if already applied optimistically by this session
          if (optimisticIds.current.has(item.recommendation.id)) {
            optimisticIds.current.delete(item.recommendation.id);
            return;
          }
          setAppliedHistory((prev) => [...prev, item]);
          setDemoState((prev) => {
            const base = baseStateRef.current;
            if (!base) return prev;
            return applyDemoIntervention(prev ?? base, item.zoneId, item.recommendation);
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setSyncStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSyncStatus("disconnected");
      });

    return () => { supabase.removeChannel(channel); };
  }, [config.demoMutationEnabled]);

  const applyDemo = useCallback(
    async (zoneId: string, recommendation: Recommendation) => {
      if (!config.demoMutationEnabled) {
        logger.info("Demo mutation disabled, ignoring apply");
        return;
      }

      // If zone is being simulated, increment the incident reduction directly
      // so the spike score drops visibly with each dispatch
      setIncidentOverrides((prev) => {
        if (!prev.has(zoneId)) return prev;
        const baseCut = recommendation.priority === RiskLevel.HIGH ? 0.20 : 0.13;
        const cut = baseCut * recommendation.confidence;
        const next = new Map(prev);
        next.set(zoneId, Math.min(0.72, (prev.get(zoneId) ?? 0) + cut));
        return next;
      });

      // Optimistic local update — apply immediately without waiting for Supabase
      optimisticIds.current.add(recommendation.id);
      const optimisticEntry: StoredIntervention = { zoneId, recommendation, appliedAt: Date.now() };
      setAppliedHistory((prev) => [...prev, optimisticEntry]);
      setDemoState((prev) => {
        const base = baseStateRef.current;
        if (!base) return prev;
        return applyDemoIntervention(prev ?? base, zoneId, recommendation);
      });

      // Persist to Supabase for cross-session sync (fire and forget)
      fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId, recommendation }),
      }).catch(() => {/* non-critical — local state already updated */});
    },
    [config.demoMutationEnabled]
  );

  // Simulated incident overrides — Map<zoneId, cumulativeReduction>
  // Value is the total reduction applied via dispatch (0 = fresh spike at 94%)
  const [incidentOverrides, setIncidentOverrides] = useState<Map<string, number>>(new Map());

  const simulateIncident = useCallback((zoneId: string) => {
    setIncidentOverrides((prev) => { const next = new Map(prev); next.set(zoneId, 0); return next; });
  }, []);

  const mergedState = useMemo(() => {
    if (!baseState) return null;
    let state = mergeSnapshotWithOverrides(baseState, demoState);
    if (incidentOverrides.size > 0) {
      state = {
        ...state,
        zones: state.zones.map((z) => {
          if (!incidentOverrides.has(z.zone_id)) return z;
          const reduction = incidentOverrides.get(z.zone_id)!;
          const spikedScore = Math.max(0.22, 0.94 - reduction);
          const spikedLevel = deriveRiskLevel(spikedScore);
          const spikedForecast = z.forecast_30m.map((fp, i) => ({
            ...fp,
            risk: Math.max(fp.risk, Math.max(0, spikedScore - i * 0.07)),
          }));
          return { ...z, risk_score: spikedScore, risk_level: spikedLevel, forecast_30m: spikedForecast };
        }),
      };
    }
    return state;
  }, [baseState, demoState, incidentOverrides]);

  const simulatedZones = useMemo(() => {
    return new Set(incidentOverrides.keys());
  }, [incidentOverrides]);

  const contextValue = useMemo(
    () => ({ liveState: mergedState, loading, error, lastValidation, applyDemo, simulateIncident, syncStatus, appliedHistory, simulatedZones }),
    [mergedState, loading, error, lastValidation, applyDemo, simulateIncident, syncStatus, appliedHistory, simulatedZones]
  );

  return (
    <LiveStateContext.Provider value={contextValue}>
      {children}
    </LiveStateContext.Provider>
  );
}
