"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiveState } from "@/lib/useLiveState";
import { RiskLevel } from "@/lib/types";
import Topbar from "@/components/Topbar";
import ForecastChart from "@/components/ForecastChart";
import RiskTimeline from "@/components/RiskTimeline";
import RecommendationCard from "@/components/RecommendationCard";
import InterventionsTable from "@/components/InterventionsTable";

const RISK_BADGE: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: "bg-green-100 text-green-700",
  [RiskLevel.MED]: "bg-amber-100 text-amber-700",
  [RiskLevel.HIGH]: "bg-red-100 text-red-700",
};

export default function ZoneDetailPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const { liveState, loading, error, applyDemo } = useLiveState();

  const handleApply = useCallback(
    (recId: string) => {
      const zone = liveState?.zones.find((z) => z.zone_id === zoneId);
      const rec = zone?.recommendations.find((r) => r.id === recId);
      if (!rec) return;
      applyDemo(zoneId, rec);
    },
    [liveState, zoneId, applyDemo]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-gray-400">Loading zone data...</div>
      </div>
    );
  }

  if (error || !liveState) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-red-500">Demo Data Unavailable</div>
      </div>
    );
  }

  const zone = liveState.zones.find((z) => z.zone_id === zoneId);

  if (!zone) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">
            Zone &quot;{zoneId}&quot; not found
          </p>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        snapshotId={liveState.snapshot_id}
        timestamp={liveState.timestamp}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">
            {zone.name}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {zone.name}
            </h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_BADGE[zone.risk_level]}`}
            >
              {zone.risk_level} RISK
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Score: {(zone.risk_score * 100).toFixed(0)}%</span>
            <span>Speed: {zone.speed_avg_mph} mph</span>
            <span>Pedestrians: {zone.pedestrian_count}</span>
            <span>
              Cameras: {zone.active_cameras}/{zone.total_cameras}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RiskTimeline zoneName={zone.name} />
          <ForecastChart
            data={zone.forecast_30m}
            title={`Risk Forecast — ${zone.name}`}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recommendations
          </h2>
          {zone.recommendations.length === 0 ? (
            <p className="text-sm text-gray-400">No recommendations</p>
          ) : (
            <div className="space-y-3">
              {zone.recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onApply={handleApply}
                />
              ))}
            </div>
          )}
        </div>

        <InterventionsTable interventions={zone.interventions} />

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Event Log
          </h3>
          {zone.events.length === 0 ? (
            <p className="text-sm text-gray-400">No events</p>
          ) : (
            <div className="space-y-2">
              {zone.events.map((evt, i) => (
                <div
                  key={`${evt.time}-${i}`}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs font-mono text-gray-400 shrink-0 pt-0.5">
                    {evt.time}
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase shrink-0 w-24 pt-0.5">
                    {evt.type}
                  </span>
                  <span className="text-sm text-gray-700">{evt.detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
