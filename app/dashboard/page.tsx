"use client";

import { useLiveState } from "@/lib/useLiveState";
import { RiskLevel } from "@/lib/types";
import Topbar from "@/components/Topbar";
import KPI from "@/components/KPI";
import ZoneTile from "@/components/ZoneTile";
import ForecastChart from "@/components/ForecastChart";
import InterventionsTable from "@/components/InterventionsTable";

function riskStatus(level: RiskLevel): "normal" | "warning" | "critical" {
  if (level === RiskLevel.HIGH) return "critical";
  if (level === RiskLevel.MED) return "warning";
  return "normal";
}

export default function DashboardPage() {
  const { liveState, loading, error } = useLiveState();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-gray-400">Loading dashboard...</div>
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

  const allInterventions = liveState.zones.flatMap((z) =>
    z.interventions.map((i) => ({ ...i, zoneName: z.name }))
  );

  const firstZone = liveState.zones[0];

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        snapshotId={liveState.snapshot_id}
        timestamp={liveState.timestamp}
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPI
            label="District Risk"
            value={liveState.district_risk}
            status={riskStatus(liveState.district_risk)}
          />
          <KPI
            label="Active Alerts"
            value={liveState.active_alerts}
            status={liveState.active_alerts > 3 ? "critical" : "normal"}
          />
          <KPI
            label="Avg Latency"
            value={`${liveState.avg_latency_ms}ms`}
            status={liveState.avg_latency_ms > 150 ? "warning" : "normal"}
          />
          <KPI
            label="Camera Health"
            value={`${liveState.camera_health_pct}%`}
            status={liveState.camera_health_pct < 95 ? "warning" : "normal"}
          />
          <KPI
            label="Forecast Horizon"
            value={`${liveState.forecast_horizon_min}m`}
            status="normal"
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Zone Overview
          </h2>
          {liveState.zones.length === 0 ? (
            <p className="text-sm text-gray-400">No zones available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveState.zones.map((zone) => (
                <ZoneTile key={zone.zone_id} zone={zone} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {firstZone && (
            <ForecastChart
              data={firstZone.forecast_30m}
              title={`Risk Forecast — ${firstZone.name}`}
            />
          )}
          <InterventionsTable interventions={allInterventions} />
        </div>
      </div>
    </div>
  );
}
