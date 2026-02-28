"use client";

import { useMemo, useState } from "react";
import { WHAT_IF_SCENARIOS, WhatIfScenarioId } from "@/lib/mapFeatures";

interface CongestionEntry {
  id: string;
  schoolName: string;
  baseCongestion: number;
}

interface WhatIfPanelProps {
  corridors: CongestionEntry[];
  getCongestion: (corridorId: string, timeMin: number) => number;
  currentTimeMin: number;
  onApplyScenario: (scenario: WhatIfScenarioId | null) => void;
  activeScenario: WhatIfScenarioId | null;
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
  onApplyScenario,
  activeScenario,
}: WhatIfPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const activeConfig = WHAT_IF_SCENARIOS.find((s) => s.id === activeScenario);

  const comparison = useMemo(() => {
    if (!activeConfig) return null;

    return corridors.map((c) => {
      const baseline = c.baseCongestion;

      // Apply scenario effects
      let adjusted = baseline;
      adjusted = adjusted * (1 - activeConfig.congestionReduction);

      // Dismissal shift: recalculate at shifted time
      if (activeConfig.dismissalShiftMin !== 0) {
        const shiftedTime = currentTimeMin - activeConfig.dismissalShiftMin;
        const shiftedCongestion = getCongestion(c.id, shiftedTime);
        adjusted = shiftedCongestion * (1 - activeConfig.congestionReduction);
      }

      const delta = adjusted - baseline;

      return {
        ...c,
        baseline,
        adjusted: Math.max(0, Math.min(1, adjusted)),
        delta,
      };
    });
  }, [corridors, activeConfig, currentTimeMin, getCongestion]);

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

          {activeScenario && (
            <button
              onClick={() => onApplyScenario(null)}
              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Clear scenario
            </button>
          )}
        </div>
      )}
    </div>
  );
}
