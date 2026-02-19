"use client";

import { LiveState } from "@/lib/types";

interface ExecImpactPanelProps {
  liveState: LiveState;
}

export default function ExecImpactPanel({ liveState }: ExecImpactPanelProps) {
  // Find the zone with the most interventions for before/after comparison
  const zonesWithInterventions = liveState.zones
    .filter((z) => z.interventions.length > 0)
    .sort((a, b) => b.interventions.length - a.interventions.length);

  const targetZone = zonesWithInterventions[0];

  if (!targetZone) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Impact Analysis</h3>
        <p className="text-sm text-gray-400">No interventions applied yet to measure impact.</p>
      </div>
    );
  }

  // Deterministic before/after: "before" is the peak forecast, "after" is the current score
  const peakForecast = targetZone.forecast_30m.reduce(
    (max, fp) => (fp.risk > max ? fp.risk : max),
    0
  );
  const beforeRisk = Math.round(peakForecast * 100);
  const afterRisk = Math.round(targetZone.risk_score * 100);
  const delta = beforeRisk - afterRisk;

  // Congestion index: derived from vehicle count / speed ratio (normalized)
  const beforeCongestion = Math.round(
    (targetZone.vehicle_count / Math.max(targetZone.speed_avg_mph, 1)) * 3
  );
  const afterCongestion = Math.round(beforeCongestion * (afterRisk / Math.max(beforeRisk, 1)));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">Impact Analysis</h3>
      <p className="text-xs text-gray-500 mb-4">
        {targetZone.name} — {targetZone.interventions.length} intervention{targetZone.interventions.length !== 1 ? "s" : ""} applied
      </p>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Risk Score</p>
          <div className="flex items-end gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{beforeRisk}%</div>
              <div className="text-[10px] text-gray-400 mt-1">Before</div>
            </div>
            <div className="text-gray-300 text-lg pb-1">&rarr;</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{afterRisk}%</div>
              <div className="text-[10px] text-gray-400 mt-1">Current</div>
            </div>
            {delta > 0 && (
              <div className="pb-1">
                <span className="text-sm font-semibold text-green-600">-{delta}%</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Congestion Index</p>
          <div className="flex items-end gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-500">{beforeCongestion}</div>
              <div className="text-[10px] text-gray-400 mt-1">Before</div>
            </div>
            <div className="text-gray-300 text-lg pb-1">&rarr;</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{afterCongestion}</div>
              <div className="text-[10px] text-gray-400 mt-1">Current</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
