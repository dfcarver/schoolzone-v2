"use client";

import { EscalationOutput, DriftWeight } from "@/lib/engines/types";

interface EscalationGaugeProps {
  output: EscalationOutput;
  driftStatus: DriftWeight;
}

const DRIFT_BADGE: Record<DriftWeight, { label: string; className: string }> = {
  NORMAL: { label: "NORMAL", className: "bg-green-100 text-green-700" },
  WARNING: { label: "WARNING", className: "bg-amber-100 text-amber-700" },
  CRITICAL: { label: "CRITICAL", className: "bg-red-100 text-red-700" },
};

function gaugeColor(probability: number): string {
  if (probability > 0.7) return "text-red-600";
  if (probability >= 0.4) return "text-amber-500";
  return "text-emerald-600";
}

function barColor(probability: number): string {
  if (probability > 0.7) return "bg-red-500";
  if (probability >= 0.4) return "bg-amber-400";
  return "bg-emerald-500";
}

export default function EscalationGauge({ output, driftStatus }: EscalationGaugeProps) {
  const pct = Math.round(output.escalation_probability * 100);
  const badge = DRIFT_BADGE[driftStatus];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Escalation Probability</h3>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <span className={`text-3xl font-bold tabular-nums ${gaugeColor(output.escalation_probability)}`}>
          {pct}%
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 pb-1">escalation likelihood</span>
      </div>

      {/* Bar gauge */}
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(output.escalation_probability)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Component breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Risk Trend</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{output.components.risk_trend >= 0 ? "+" : ""}{output.components.risk_trend.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Congestion Trend</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{output.components.congestion_trend >= 0 ? "+" : ""}{output.components.congestion_trend.toFixed(3)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Drift Weight</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{output.components.drift_weight.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Confidence Factor</span>
          <span className="font-mono text-gray-700 dark:text-gray-300">{output.components.confidence_factor.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}
