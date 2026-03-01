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
  SnapshotPhase,
} from "./types";
import type { StoredIntervention } from "./interventionStore";
import { supabase } from "./supabase";
import { loadLiveState } from "./data";
import {
  nextSnapshotPhase,
  snapshotFile,
  applyDemoIntervention,
  mergeSnapshotWithOverrides,
} from "./stateMachine";
import { useDemoConfig, ScenarioId } from "./demoConfig";
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
  syncStatus: SyncStatus;
  appliedHistory: StoredIntervention[];
}

const LiveStateContext = createContext<LiveStateContextValue>({
  liveState: null,
  loading: true,
  error: null,
  lastValidation: null,
  applyDemo: () => {},
  syncStatus: "connecting",
  appliedHistory: [],
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
  const pendingSnapshotRef = useRef<StoredIntervention[]>([]);

  const fetchSnapshot = useCallback(async (phase: SnapshotPhase, scenario: ScenarioId, validate: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const file = snapshotFile(phase);
      const data = await loadLiveState(file, scenario, controller.signal);
      if (controller.signal.aborted) return;

      if (data) {
        if (validate) {
          const result = validateLiveState(data);
          setLastValidation(result);
          if (!result.valid) logger.warn("Snapshot validation failed", result.errors);
        }
        setBaseState(data);
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
    fetchSnapshot(initialPhase, config.scenario, config.runtimeValidationEnabled);

    if (config.timeMode === "paused") return;

    const interval = setInterval(() => {
      const next = nextSnapshotPhase(phaseRef.current);
      phaseRef.current = next;
      fetchSnapshot(next, config.scenario, config.runtimeValidationEnabled);
    }, config.snapshotIntervalMs);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchSnapshot, config.scenario, config.timeMode, config.snapshotIntervalMs, config.runtimeValidationEnabled]);

  // Mirror baseState into ref and flush pending interventions
  useEffect(() => {
    baseStateRef.current = baseState;
    if (baseState && pendingSnapshotRef.current.length > 0) {
      const pending = pendingSnapshotRef.current;
      pendingSnapshotRef.current = [];
      setDemoState((prev) => replayInterventions(baseState, prev, pending));
    }
  }, [baseState]);

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
      await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoneId, recommendation }),
      });
    },
    [config.demoMutationEnabled]
  );

  const mergedState = useMemo(
    () => (baseState ? mergeSnapshotWithOverrides(baseState, demoState) : null),
    [baseState, demoState]
  );

  const contextValue = useMemo(
    () => ({ liveState: mergedState, loading, error, lastValidation, applyDemo, syncStatus, appliedHistory }),
    [mergedState, loading, error, lastValidation, applyDemo, syncStatus, appliedHistory]
  );

  return (
    <LiveStateContext.Provider value={contextValue}>
      {children}
    </LiveStateContext.Provider>
  );
}
