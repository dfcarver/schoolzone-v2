"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type ScenarioId = "normal" | "surge" | "weather" | "dismissal";
export type TimeMode = "live" | "paused";

export interface DemoConfig {
  scenario: ScenarioId;
  snapshotIntervalMs: number;
  timeMode: TimeMode;
  demoMutationEnabled: boolean;
  runtimeValidationEnabled: boolean;
}

const DEFAULT_CONFIG: DemoConfig = {
  scenario: "normal",
  snapshotIntervalMs: 5000,
  timeMode: "live",
  demoMutationEnabled: true,
  runtimeValidationEnabled: true,
};

const STORAGE_KEY = "schoolzone-demo-config";

function loadConfig(): DemoConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(config: DemoConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
