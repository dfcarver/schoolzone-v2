"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
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

const INTERVAL_MS = 5000;

interface LiveStateContextValue {
  liveState: LiveState | null;
  loading: boolean;
  error: string | null;
  applyDemo: (zoneId: string, recommendation: Recommendation) => void;
}

const LiveStateContext = createContext<LiveStateContextValue>({
  liveState: null,
  loading: true,
  error: null,
  applyDemo: () => {},
});

export function useLiveStateContext(): LiveStateContextValue {
  return useContext(LiveStateContext);
}

export function LiveStateProvider({ children }: { children: ReactNode }) {
  const [baseState, setBaseState] = useState<LiveState | null>(null);
  const [demoState, setDemoState] = useState<LiveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const phaseRef = useRef<SnapshotPhase>(SnapshotPhase.INITIAL);
  const fetchingRef = useRef(false);

  const fetchSnapshot = useCallback(async (phase: SnapshotPhase) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const file = snapshotFile(phase);
      const data = await loadLiveState(file);
      if (data) {
        setBaseState(data);
        setError(null);
      } else {
        setError("Demo Data Unavailable");
      }
    } catch {
      setError("Demo Data Unavailable");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialPhase = nextSnapshotPhase(phaseRef.current);
    phaseRef.current = initialPhase;
    fetchSnapshot(initialPhase);

    const interval = setInterval(() => {
      const next = nextSnapshotPhase(phaseRef.current);
      phaseRef.current = next;
      fetchSnapshot(next);
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  const applyDemo = useCallback(
    (zoneId: string, recommendation: Recommendation) => {
      const current = demoState ?? baseState;
      if (!current) return;
      const updated = applyDemoIntervention(current, zoneId, recommendation);
      setDemoState(updated);
    },
    [demoState, baseState]
  );

  const mergedState = baseState
    ? mergeSnapshotWithOverrides(baseState, demoState)
    : null;

  return (
    <LiveStateContext.Provider
      value={{ liveState: mergedState, loading, error, applyDemo }}
    >
      {children}
    </LiveStateContext.Provider>
  );
}
