import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WhatIfScenarioId, WHAT_IF_SCENARIOS } from "@/lib/mapFeatures";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CongestionPeak {
  centerMin: number;
  spread: number;
  intensity: number;
}

export interface CorridorDef {
  id: string;
  name: string;
  path: { lat: number; lng: number }[];
  school: {
    zone_id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    enrollment: number;
  };
  peaks: CongestionPeak[];
  baselineCongestion: number;
}

export type CongestionEntry = CorridorDef & { congestion: number };

// ---------------------------------------------------------------------------
// Pure functions (exported for use in CorridorMapFallback and tests)
// ---------------------------------------------------------------------------

export function gaussianBell(x: number, center: number, spread: number): number {
  const d = (x - center) / spread;
  return Math.exp(-0.5 * d * d);
}

export function getCongestionForCorridor(
  corridor: CorridorDef,
  minuteOfDay: number,
  weatherMultiplier: number,
  scenario: WhatIfScenarioId | null
): number {
  const scenarioConfig = scenario ? WHAT_IF_SCENARIOS.find((s) => s.id === scenario) : null;
  let level = corridor.baselineCongestion;
  for (const peak of corridor.peaks) {
    const adjustedCenter = peak.centerMin + (scenarioConfig?.dismissalShiftMin ?? 0);
    const adjustedSpread = peak.spread + (scenarioConfig?.peakSpreadIncrease ?? 0);
    level += peak.intensity * gaussianBell(minuteOfDay, adjustedCenter, adjustedSpread);
  }
  level = level * weatherMultiplier;
  if (scenarioConfig) {
    level = level * (1 - scenarioConfig.congestionReduction);
  }
  return Math.min(level, 1);
}

export function congestionLabel(value: number): string {
  if (value >= 0.75) return "Severe";
  if (value >= 0.5) return "Heavy";
  if (value >= 0.3) return "Moderate";
  return "Light";
}

export function congestionColor(value: number): string {
  if (value >= 0.75) return "#dc2626";
  if (value >= 0.5) return "#f59e0b";
  if (value >= 0.3) return "#facc15";
  return "#22c55e";
}

export function formatTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseCongestionEngineOptions {
  corridors: CorridorDef[];
  weatherMultiplier: number;
  activeScenario: WhatIfScenarioId | null;
  initialTimeMin?: number;
}

export interface UseCongestionEngineResult {
  timeMin: number;
  setTimeMin: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  congestionData: CongestionEntry[];
  getCongestion: (corridorId: string, time: number) => number;
}

export function useCongestionEngine({
  corridors,
  weatherMultiplier,
  activeScenario,
  initialTimeMin = 7 * 60 + 45,
}: UseCongestionEngineOptions): UseCongestionEngineResult {
  const [timeMin, setTimeMin] = useState(initialTimeMin);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setTimeMin((prev) => (prev >= 20 * 60 ? 6 * 60 : prev + 5));
      }, 150);
    } else if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
    return () => {
      if (playRef.current) clearInterval(playRef.current);
    };
  }, [isPlaying]);

  const congestionData = useMemo<CongestionEntry[]>(
    () =>
      corridors.map((c) => ({
        ...c,
        congestion: getCongestionForCorridor(c, timeMin, weatherMultiplier, activeScenario),
      })),
    [corridors, timeMin, weatherMultiplier, activeScenario]
  );

  const getCongestion = useCallback(
    (corridorId: string, time: number) => {
      const corridor = corridors.find((c) => c.id === corridorId);
      if (!corridor) return 0;
      return getCongestionForCorridor(corridor, time, weatherMultiplier, activeScenario);
    },
    [corridors, weatherMultiplier, activeScenario]
  );

  return { timeMin, setTimeMin, isPlaying, setIsPlaying, congestionData, getCongestion };
}
