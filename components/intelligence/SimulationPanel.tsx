"use client";

import { useState, useMemo } from "react";
import { ForecastPoint } from "@/lib/types";
import { InterventionType, SimulationOutput } from "@/lib/engines/types";
import { computeSimulation } from "@/lib/engines/simulation";

interface SimulationPanelProps {
  baselineForecast: ForecastPoint[];
  escalationProbability: number;
}

const INTERVENTION_OPTIONS: { value: InterventionType; label: string }[] = [
  { value: "SIGNAL_TIMING", label: "Signal Timing Adjustment" },
  { value: "TRAFFIC_DIVERSION", label: "Traffic Diversion" },
  { value: "ENFORCEMENT", label: "Enforcement Deployment" },
];

export default function SimulationPanel({ baselineForecast, escalationProbability }: SimulationPanelProps) {
  const [selectedType, setSelectedType] = useState<InterventionType>("SIGNAL_TIMING");
  const [result, setResult] = useState<SimulationOutput | null>(null);

  const handleSimulate = () => {
    const output = computeSimulation({
      baseline_forecast: baselineForecast,
      escalation_probability: escalationProbability,
      intervention_type: selectedType,
    });
    setResult(output);
  };

  const maxRisk = useMemo(() => {
    const allRisks = [
      ...baselineForecast.map((f) => f.risk),
      ...(result?.adjusted_forecast.map((f) => f.risk) ?? []),
    ];
    return Math.max(...allRisks, 0.01);
  }, [baselineForecast, result]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">What-If Simulation</h3>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-4">
        Simulate intervention impact on forecast. No canonical state is mutated.
      </p>

      <div className="flex items-center gap-3 mb-5">
        <select
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value as InterventionType); setResult(null); }}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
        >
          {INTERVENTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={handleSimulate}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Simulate
        </button>
      </div>

      {result && (
        <div className="space-y-5">
          {/* Before/After Chart */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Forecast Comparison</p>
            <div className="space-y-1.5">
              {baselineForecast.map((bp, i) => {
                const ap = result.adjusted_forecast[i];
                const baseW = (bp.risk / maxRisk) * 100;
                const adjW = ap ? (ap.risk / maxRisk) * 100 : 0;
                return (
                  <div key={bp.time} className="flex items-center gap-2 text-[10px]">
                    <span className="w-12 text-gray-400 font-mono shrink-0">{bp.time}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 bg-red-300 rounded-full transition-all" style={{ width: `${baseW}%` }} />
                        <span className="text-gray-400 w-10 text-right">{(bp.risk * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-1.5 bg-emerald-400 rounded-full transition-all" style={{ width: `${adjW}%` }} />
                        <span className="text-gray-400 w-10 text-right">{ap ? (ap.risk * 100).toFixed(0) : 0}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
              <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-red-300 rounded-full" /> Baseline</div>
              <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-emerald-400 rounded-full" /> Simulated</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Escalation Delta</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {escalationProbability > 0 ? (
                  <span className="text-emerald-600">
                    {((result.adjusted_escalation_probability - escalationProbability) * 100).toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-gray-400">0.0%</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Risk Delta (Avg)</p>
              <p className="text-sm font-bold text-emerald-600">
                {(result.risk_delta * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">New Escalation</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {(result.adjusted_escalation_probability * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {!result && baselineForecast.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">No forecast data available for simulation.</p>
      )}
    </div>
  );
}
