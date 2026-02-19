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

interface LiveStateContextValue {
  liveState: LiveState | null;
  loading: boolean;
  error: string | null;
  lastValidation: ValidationResult | null;
  applyDemo: (zoneId: string, recommendation: Recommendation) => void;
}

const LiveStateContext = createContext<LiveStateContextValue>({
  liveState: null,
  loading: true,
  error: null,
  lastValidation: null,
  applyDemo: () => {},
});

export function useLiveStateContext(): LiveStateContextValue {
  return useContext(LiveStateContext);
}

export function LiveStateProvider({ children }: { children: ReactNode }) {
  const { config } = useDemoConfig();
  const [baseState, setBaseState] = useState<LiveState | null>(null);
  const [demoState, setDemoState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);
  const phaseRef = useRef<SnapshotPhase>(SnapshotPhase.INITIAL);
  const abortRef = useRef<AbortController | null>(null);

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
          if (!result.valid) {
            logger.warn("Snapshot validation failed", result.errors);
          }
        }
        setBaseState(data);
        setError(null);
        recordRotation();
      } else {
        setError("Demo Data Unavailable");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Demo Data Unavailable");
      }
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

  const applyDemo = useCallback(
    (zoneId: string, recommendation: Recommendation) => {
      if (!config.demoMutationEnabled) {
        logger.info("Demo mutation disabled, ignoring apply");
        return;
      }
      const current = demoState ?? baseState;
      if (!current) return;
      const updated = applyDemoIntervention(current, zoneId, recommendation);
      setDemoState(updated);
    },
    [demoState, baseState, config.demoMutationEnabled]
  );

  const mergedState = useMemo(
    () => (baseState ? mergeSnapshotWithOverrides(baseState, demoState) : null),
    [baseState, demoState]
  );

  const contextValue = useMemo(
    () => ({ liveState: mergedState, loading, error, lastValidation, applyDemo }),
    [mergedState, loading, error, lastValidation, applyDemo]
  );

  return (
    <LiveStateContext.Provider value={contextValue}>
      {children}
    </LiveStateContext.Provider>
  );
}
