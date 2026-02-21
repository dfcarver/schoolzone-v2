"use client";

import { useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiveState } from "@/lib/useLiveState";
import { RiskLevel } from "@/lib/types";
import Topbar from "@/components/Topbar";
import ForecastChart from "@/components/ForecastChart";
import RiskTimeline from "@/components/RiskTimeline";
import RecommendationCard from "@/components/RecommendationCard";
import InterventionsTable from "@/components/InterventionsTable";
import AIBriefPanel from "@/components/ai/AIBriefPanel";
import EscalationGauge from "@/components/intelligence/EscalationGauge";
import AnomalyBadge from "@/components/intelligence/AnomalyBadge";
import SimulationPanel from "@/components/intelligence/SimulationPanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import { deriveDriftStatus } from "@/lib/rollups";
import { buildAIBriefRequest } from "@/lib/ai/buildRequest";
import { computeEscalation } from "@/lib/engines/escalation";
import { computeAnomaly } from "@/lib/engines/anomaly";
import { buildEscalationInput, buildAnomalyInput } from "@/lib/engines/buildInputs";

const RISK_BADGE: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: "bg-green-100 text-green-700",
  [RiskLevel.MED]: "bg-amber-100 text-amber-700",
  [RiskLevel.HIGH]: "bg-red-100 text-red-700",
};

export default function OpsZoneDetailPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const { liveState, loading, error, applyDemo } = useLiveState();

  const zone = useMemo(
    () => liveState?.zones.find((z) => z.zone_id === zoneId) ?? null,
    [liveState, zoneId]
  );

  const driftStatus = useMemo(() => {
    if (!liveState) return "NORMAL" as const;
    return deriveDriftStatus(liveState);
  }, [liveState]);

  const escalationOutput = useMemo(() => {
    if (!zone) return null;
    return computeEscalation(buildEscalationInput(zone, driftStatus));
  }, [zone, driftStatus]);

  const aiBriefRequest = useMemo(() => {
    if (!liveState || !zone) return null;
    return buildAIBriefRequest(zone, driftStatus, escalationOutput?.escalation_probability);
  }, [liveState, zone, driftStatus, escalationOutput]);

  const anomalyOutput = useMemo(() => {
    if (!zone) return null;
    return computeAnomaly(buildAnomalyInput(zone));
  }, [zone]);

  const handleApply = useCallback(
    (recId: string) => {
      const rec = zone?.recommendations.find((r) => r.id === recId);
      if (!rec) return;
      applyDemo(zoneId, rec);
    },
    [zone, zoneId, applyDemo]
  );

  if (loading) return <PageSkeleton />;
  if (error || !liveState) return <ErrorState message={error ?? "Demo Data Unavailable"} backHref="/operations/dashboard" backLabel="Back to Dashboard" />;

  if (!zone) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Zone &quot;{zoneId}&quot; not found</p>
          <Link href="/operations/dashboard" className="text-sm text-blue-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Zone Operations" snapshotId={liveState.snapshot_id} timestamp={liveState.timestamp} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/operations/dashboard" className="text-sm text-gray-400 hover:text-gray-600">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">{zone.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{zone.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_BADGE[zone.risk_level]}`}>
              {zone.risk_level} RISK
            </span>
            {anomalyOutput && anomalyOutput.anomaly_score >= 0.3 && (
              <AnomalyBadge output={anomalyOutput} />
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Score: {(zone.risk_score * 100).toFixed(0)}%</span>
            <span>Speed: {zone.speed_avg_mph} mph</span>
            <span>Pedestrians: {zone.pedestrian_count}</span>
            <span>Cameras: {zone.active_cameras}/{zone.total_cameras}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskTimeline zoneName={zone.name} />
          <ForecastChart data={zone.forecast_30m} title={`Risk Forecast — ${zone.name}`} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Recommendations</h2>
          {zone.recommendations.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No recommendations</p>
          ) : (
            <div className="space-y-3">
              {zone.recommendations.map((rec) => (
                <RecommendationCard key={rec.id} recommendation={rec} onApply={handleApply} />
              ))}
            </div>
          )}
        </div>

        <InterventionsTable interventions={zone.interventions} />

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Event Log</h3>
          {zone.events.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No events</p>
          ) : (
            <div className="space-y-2">
              {zone.events.map((evt, i) => (
                <div key={`${evt.time}-${i}`} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-xs font-mono text-gray-400 dark:text-gray-500 shrink-0 pt-0.5">{evt.time}</span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase shrink-0 w-24 pt-0.5">{evt.type}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{evt.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {escalationOutput && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EscalationGauge output={escalationOutput} driftStatus={driftStatus === "DRIFT" ? "CRITICAL" : driftStatus} />
            <SimulationPanel baselineForecast={zone.forecast_30m} escalationProbability={escalationOutput.escalation_probability} />
          </div>
        )}

        {aiBriefRequest && <AIBriefPanel request={aiBriefRequest} />}
      </div>
    </div>
  );
}
