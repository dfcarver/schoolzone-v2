"use client";

import { useMemo, useState } from "react";
import { useLiveState } from "@/lib/useLiveState";
import Topbar from "@/components/Topbar";
import ExecutiveKPI from "@/components/ExecutiveKPI";
import RiskHeatmap from "@/components/RiskHeatmap";
import ExecImpactPanel from "@/components/ExecImpactPanel";
import AIBriefPanel from "@/components/ai/AIBriefPanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import {
  computeDistrictRollup,
  computeHeatmap,
  computeEmergingRisks,
  computeActiveMitigations,
  deriveDriftStatus,
} from "@/lib/rollups";
import { exportExecutiveSummaryJSON } from "@/lib/export";
import { buildAIBriefRequest } from "@/lib/ai/buildRequest";
import { computeEscalation } from "@/lib/engines/escalation";
import { buildEscalationInput } from "@/lib/engines/buildInputs";
import EscalationGauge from "@/components/intelligence/EscalationGauge";
import SimulationPanel from "@/components/intelligence/SimulationPanel";

export default function ExecutivePage() {
  const { liveState, loading, error, lastValidation } = useLiveState();

  const rollup = useMemo(() => {
    if (!liveState) return null;
    const drift = deriveDriftStatus(liveState);
    return computeDistrictRollup(liveState, lastValidation, drift);
  }, [liveState, lastValidation]);

  const heatmap = useMemo(() => {
    if (!liveState) return [];
    return computeHeatmap(liveState);
  }, [liveState]);

  const emergingRisks = useMemo(() => {
    if (!liveState) return [];
    return computeEmergingRisks(liveState);
  }, [liveState]);

  const activeMitigations = useMemo(() => {
    if (!liveState) return [];
    return computeActiveMitigations(liveState);
  }, [liveState]);

  const [selectedZoneId, setSelectedZoneId] = useState<string>("");

  const driftStatus = useMemo(() => {
    if (!liveState) return "NORMAL" as const;
    return deriveDriftStatus(liveState);
  }, [liveState]);

  const selectedZone = useMemo(() => {
    if (!liveState || !selectedZoneId) return null;
    return liveState.zones.find((z) => z.zone_id === selectedZoneId) ?? null;
  }, [liveState, selectedZoneId]);

  const escalationOutput = useMemo(() => {
    if (!selectedZone) return null;
    const input = buildEscalationInput(selectedZone, driftStatus);
    return computeEscalation(input);
  }, [selectedZone, driftStatus]);

  const aiBriefRequest = useMemo(() => {
    if (!selectedZone) return null;
    return buildAIBriefRequest(selectedZone, driftStatus, escalationOutput?.escalation_probability);
  }, [selectedZone, driftStatus, escalationOutput]);

  if (loading) return <PageSkeleton />;
  if (error || !liveState || !rollup) return <ErrorState message={error ?? "Demo Data Unavailable"} />;

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        title="Executive Command Brief"
        snapshotId={liveState.snapshot_id}
        timestamp={liveState.timestamp}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <ExecutiveKPI
            label="District Risk"
            value={rollup.districtRiskIndex}
            subtitle="Risk index (0–100)"
            governanceStatus={rollup.governanceStatus}
          />
          <ExecutiveKPI
            label="High-Risk Window"
            value={rollup.forecastedHighRiskWindow}
            subtitle={`Peak: ${rollup.forecastedHighRiskValue}%`}
          />
          <ExecutiveKPI
            label="Interventions"
            value={rollup.interventionsAppliedToday}
            subtitle="Applied today"
          />
          <ExecutiveKPI
            label="Effectiveness"
            value={`${rollup.effectiveness}%`}
            subtitle="Avg risk reduction"
          />
          <ExecutiveKPI
            label="Governance"
            value={rollup.governanceStatus}
            governanceStatus={rollup.governanceStatus}
          />
          <ExecutiveKPI
            label="Active Alerts"
            value={liveState.active_alerts}
            subtitle={`${liveState.zones.length} zones monitored`}
          />
        </div>

        {/* Heatmap */}
        <RiskHeatmap entries={heatmap} />

        {/* Two-column: Emerging Risks + Active Mitigations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Emerging Risks */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Emerging Risks</h3>
            {emergingRisks.length === 0 ? (
              <p className="text-sm text-gray-400">No emerging risks detected</p>
            ) : (
              <div className="space-y-3">
                {emergingRisks.map((r) => (
                  <div key={r.zone_id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{r.zoneName}</span>
                      <span className="text-xs text-gray-400 ml-2">peaks at {r.peakTime}</span>
                    </div>
                    <span className={`text-sm font-bold ${r.peakRisk >= 0.7 ? "text-red-600" : r.peakRisk >= 0.4 ? "text-amber-600" : "text-green-600"}`}>
                      {Math.round(r.peakRisk * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Mitigations */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Active Mitigations</h3>
            {activeMitigations.length === 0 ? (
              <p className="text-sm text-gray-400">No active mitigations</p>
            ) : (
              <div className="space-y-3">
                {activeMitigations.map((m, i) => (
                  <div key={`${m.zone_id}-${i}`} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900 block truncate">{m.action}</span>
                      <span className="text-xs text-gray-400">{m.zoneName} — {m.appliedAt}</span>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0 ml-2">Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Impact Panel */}
        <ExecImpactPanel liveState={liveState} />

        {/* AI Operational Brief */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-900">AI Operational Brief</h2>
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
            >
              <option value="">Select corridor…</option>
              {liveState.zones.map((z) => (
                <option key={z.zone_id} value={z.zone_id}>{z.name}</option>
              ))}
            </select>
          </div>
          {aiBriefRequest ? (
            <AIBriefPanel request={aiBriefRequest} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <p className="text-sm text-gray-400">Select a corridor above to generate an AI operational brief.</p>
            </div>
          )}
          {selectedZone && escalationOutput && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <EscalationGauge output={escalationOutput} driftStatus={driftStatus === "DRIFT" ? "CRITICAL" : driftStatus} />
              <SimulationPanel baselineForecast={selectedZone.forecast_30m} escalationProbability={escalationOutput.escalation_probability} />
            </div>
          )}
        </div>

        {/* Export */}
        <div className="flex justify-end">
          <button
            onClick={() => exportExecutiveSummaryJSON(rollup)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export Summary JSON
          </button>
        </div>
      </div>
    </div>
  );
}
