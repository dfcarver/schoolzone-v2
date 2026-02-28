"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  WHAT_IF_SCENARIOS,
  WhatIfScenarioId,
  WeatherCondition,
  SavedScenario,
  loadSavedScenarios,
  persistSavedScenarios,
} from "@/lib/mapFeatures";
import { formatTime } from "@/lib/hooks/useCongestionEngine";
import FeatureHint from "./FeatureHint";

interface CongestionEntry {
  id: string;
  schoolName: string;
  baseCongestion: number;
}

interface WhatIfPanelProps {
  corridors: CongestionEntry[];
  getCongestion: (corridorId: string, timeMin: number) => number;
  currentTimeMin: number;
  weather: WeatherCondition;
  onApplyScenario: (scenario: WhatIfScenarioId | null) => void;
  activeScenario: WhatIfScenarioId | null;
  onLoadSaved?: (scenarioId: WhatIfScenarioId, timeMin: number, weather: WeatherCondition) => void;
}

function congestionColor(v: number): string {
  if (v >= 0.75) return "#dc2626";
  if (v >= 0.5) return "#f59e0b";
  if (v >= 0.3) return "#facc15";
  return "#22c55e";
}

function congestionLabel(v: number): string {
  if (v >= 0.75) return "Severe";
  if (v >= 0.5) return "Heavy";
  if (v >= 0.3) return "Moderate";
  return "Light";
}

export default function WhatIfPanel({
  corridors,
  getCongestion,
  currentTimeMin,
  weather,
  onApplyScenario,
  activeScenario,
  onLoadSaved,
}: WhatIfPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  useEffect(() => {
    setSavedScenarios(loadSavedScenarios());
  }, []);

  const activeConfig = WHAT_IF_SCENARIOS.find((s) => s.id === activeScenario);

  const comparison = useMemo(() => {
    if (!activeConfig) return null;
    return corridors.map((c) => {
      const baseline = c.baseCongestion;
      let adjusted = baseline;
      adjusted = adjusted * (1 - activeConfig.congestionReduction);
      if (activeConfig.dismissalShiftMin !== 0) {
        const shiftedTime = currentTimeMin - activeConfig.dismissalShiftMin;
        const shiftedCongestion = getCongestion(c.id, shiftedTime);
        adjusted = shiftedCongestion * (1 - activeConfig.congestionReduction);
      }
      const delta = adjusted - baseline;
      return { ...c, baseline, adjusted: Math.max(0, Math.min(1, adjusted)), delta };
    });
  }, [corridors, activeConfig, currentTimeMin, getCongestion]);

  const handleSave = useCallback(() => {
    if (!activeScenario || !saveName.trim()) return;
    const entry: SavedScenario = {
      id: `saved-${Date.now()}`,
      name: saveName.trim(),
      savedAt: Date.now(),
      scenarioId: activeScenario,
      timeMin: currentTimeMin,
      weather,
    };
    const next = [entry, ...savedScenarios];
    setSavedScenarios(next);
    persistSavedScenarios(next);
    setSaveName("");
    setShowSaveInput(false);
  }, [activeScenario, saveName, savedScenarios, currentTimeMin, weather]);

  const handleDelete = useCallback((id: string) => {
    const next = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(next);
    persistSavedScenarios(next);
  }, [savedScenarios]);

  const handleLoad = useCallback((s: SavedScenario) => {
    onApplyScenario(s.scenarioId);
    onLoadSaved?.(s.scenarioId, s.timeMin, s.weather);
  }, [onApplyScenario, onLoadSaved]);

  const handleExport = useCallback((s: SavedScenario) => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scenario-${s.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportAll = useCallback(() => {
    if (savedScenarios.length === 0) return;
    const blob = new Blob([JSON.stringify(savedScenarios, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schoolzone-scenarios.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [savedScenarios]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100">
          What-If Scenarios
          {activeConfig && (
            <span className="ml-2 text-[10px] font-normal text-emerald-600">
              Active: {activeConfig.label}
            </span>
          )}
        </h4>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <FeatureHint>
            Pick a scenario to see the comparison table below. Dismissal shifts move the congestion peak window — watch corridor colors update in real time on the map. Save a named scenario to reload it later.
          </FeatureHint>
          {/* Scenario grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {WHAT_IF_SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => onApplyScenario(activeScenario === s.id ? null : s.id)}
                className={`text-left p-2.5 rounded-lg border transition-colors ${
                  activeScenario === s.id
                    ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <p className={`text-[11px] font-medium ${
                  activeScenario === s.id ? "text-emerald-700 dark:text-emerald-300" : "text-gray-800 dark:text-gray-200"
                }`}>
                  {s.label}
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-2">{s.description}</p>
              </button>
            ))}
          </div>

          {/* Comparison table */}
          {comparison && (
            <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-3 py-1.5 font-medium text-gray-500 dark:text-gray-400">Corridor</th>
                    <th className="text-center px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Current</th>
                    <th className="text-center px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Projected</th>
                    <th className="text-center px-2 py-1.5 font-medium text-gray-500 dark:text-gray-400">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((c) => (
                    <tr key={c.id} className="border-t border-gray-50 dark:border-gray-800">
                      <td className="px-3 py-1.5 text-gray-800 dark:text-gray-200 font-medium truncate max-w-[120px]">
                        {c.schoolName}
                      </td>
                      <td className="text-center px-2 py-1.5">
                        <span style={{ color: congestionColor(c.baseline) }}>
                          {congestionLabel(c.baseline)}
                        </span>
                      </td>
                      <td className="text-center px-2 py-1.5">
                        <span style={{ color: congestionColor(c.adjusted) }}>
                          {congestionLabel(c.adjusted)}
                        </span>
                      </td>
                      <td className="text-center px-2 py-1.5">
                        <span className={c.delta < -0.01 ? "text-green-600" : c.delta > 0.01 ? "text-red-600" : "text-gray-400"}>
                          {c.delta < -0.01 ? "↓" : c.delta > 0.01 ? "↑" : "—"} {Math.abs(Math.round(c.delta * 100))}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-3 flex-wrap">
            {activeScenario && (
              <button
                onClick={() => onApplyScenario(null)}
                className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                Clear scenario
              </button>
            )}

            {activeScenario && (
              <>
                {showSaveInput ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setShowSaveInput(false); }}
                      placeholder="Name this scenario…"
                      autoFocus
                      className="flex-1 text-[10px] px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={handleSave}
                      disabled={!saveName.trim()}
                      className="text-[10px] px-2.5 py-1 rounded bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowSaveInput(false); setSaveName(""); }}
                      className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors ml-auto"
                  >
                    + Save scenario
                  </button>
                )}
              </>
            )}
          </div>

          {/* Saved scenarios */}
          {savedScenarios.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <button
                onClick={() => setSavedOpen((v) => !v)}
                className="flex items-center justify-between w-full mb-2"
              >
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  Saved Scenarios ({savedScenarios.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleExportAll(); }}
                    className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    Export all
                  </button>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform ${savedOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {savedOpen && (
                <div className="space-y-1.5">
                  {savedScenarios.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                        <p className="text-[9px] text-gray-400">
                          {WHAT_IF_SCENARIOS.find((sc) => sc.id === s.scenarioId)?.label} · {formatTime(s.timeMin)} · {s.weather}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleLoad(s)}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleExport(s)}
                          className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline"
                        >
                          Export
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-[10px] text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
