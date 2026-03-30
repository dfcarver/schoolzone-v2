"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type ScenarioId = "normal" | "surge" | "weather" | "dismissal";
export type TimeMode = "live" | "paused";
export type DataMode = "live" | "demo";
export type CityId = "springfield_il" | "khalifa_city_auh" | "mbz_city_auh";
export type WeatherMode = "clear" | "rain" | "fog";

export interface DemoConfig {
  scenario: ScenarioId;
  snapshotIntervalMs: number;
  timeMode: TimeMode;
  demoMutationEnabled: boolean;
  runtimeValidationEnabled: boolean;
  dataMode: DataMode;
  selectedCity: CityId;
  weather: WeatherMode;
  /** Map time-slider position in minutes-of-day (0–1439). null = user hasn't moved the slider, no blending. Not persisted. */
  simTimeMin: number | null;
}

const DEFAULT_CONFIG: DemoConfig = {
  scenario: "normal",
  snapshotIntervalMs: 5000,
  timeMode: "live",
  demoMutationEnabled: true,
  runtimeValidationEnabled: true,
  dataMode: process.env.NEXT_PUBLIC_AWS_SNAPSHOT_API_URL ? "live" : "demo",
  selectedCity: "khalifa_city_auh",
  weather: "clear",
  simTimeMin: null,
};

const STORAGE_KEY = "schoolzone-demo-config";

function loadConfig(): DemoConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_CONFIG, ...parsed };
    // Always use live data when AWS API is configured, regardless of stored preference
    if (process.env.NEXT_PUBLIC_AWS_SNAPSHOT_API_URL) merged.dataMode = "live";
    return merged;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: DemoConfig): void {
  if (typeof window === "undefined") return;
  try {
    const toSave = { ...config };
    delete (toSave as Partial<DemoConfig>).simTimeMin;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage unavailable
  }
}

interface DemoConfigContextValue {
  config: DemoConfig;
  updateConfig: (partial: Partial<DemoConfig>) => void;
}

const DemoConfigContext = createContext<DemoConfigContextValue>({
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
});

export function useDemoConfig(): DemoConfigContextValue {
  return useContext(DemoConfigContext);
}

export function DemoConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DemoConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const updateConfig = useCallback((partial: Partial<DemoConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...partial };
      saveConfig(next);
      return next;
    });
  }, []);

  return (
    <DemoConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </DemoConfigContext.Provider>
  );
}

export function scenarioBasePath(scenario: ScenarioId): string {
  return `/mock/scenarios/${scenario}`;
}
