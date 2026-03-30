"use client";

import { useMemo } from "react";
import { useLiveState } from "@/lib/useLiveState";
import { useDemoConfig } from "@/lib/demoConfig";
import { RiskLevel } from "@/lib/types";
import Topbar from "@/components/Topbar";
import KPI from "@/components/KPI";
import ZoneTile from "@/components/ZoneTile";
import ForecastChart from "@/components/ForecastChart";
import InterventionsTable from "@/components/InterventionsTable";
import CorridorMap from "@/components/CorridorMap";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";
import { CITIES } from "@/lib/cityConfig";
import { getCongestionForCorridor } from "@/lib/hooks/useCongestionEngine";

function riskStatus(level: RiskLevel): "normal" | "warning" | "critical" {
  if (level === RiskLevel.HIGH) return "critical";
  if (level === RiskLevel.MED) return "warning";
  return "normal";
}

export default function OperationsDashboardPage() {
  const { liveState, loading, error } = useLiveState();
  const { config, updateConfig } = useDemoConfig();
  const selectedCity = config.selectedCity;

  const corridorZones = useMemo(() => {
    if (selectedCity === "springfield_il") return null;
    const cityConfig = CITIES.find(c => c.id === selectedCity);
    if (!cityConfig) return null;
    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    return cityConfig.corridors.map((corridor) => {
      const riskNow = Math.round(getCongestionForCorridor(corridor, minuteOfDay, 1.0, null) * 100);
      const risk_level: RiskLevel = riskNow >= 60 ? RiskLevel.HIGH : riskNow >= 40 ? RiskLevel.MED : RiskLevel.LOW;
      return {
        zone_id: corridor.school.zone_id,
        name: corridor.school.name,
        risk_score: riskNow / 100,
        risk_level,
        speed_avg_mph: Math.round(30 - riskNow * 0.2),
        pedestrian_count: Math.round(riskNow * 0.8),
        vehicle_count: Math.round(riskNow * 1.5),
        active_cameras: 4,
        total_cameras: 4,
        forecast_30m: [],
        recommendations: [],
        events: [],
        interventions: [],
      };
    });
  }, [selectedCity]);

  if (loading) return <PageSkeleton />;
  if (error || !liveState) return <ErrorState message={error ?? "Demo Data Unavailable"} />;

  const displayZones = corridorZones ?? liveState.zones;

  const allInterventions = liveState.zones.flatMap((z) =>
    z.interventions.map((i) => ({ ...i, zoneName: z.name }))
  );

  const firstZone = displayZones[0];

  return (
    <div className="flex flex-col h-screen">
      <Topbar
        title="Operations Dashboard"
        snapshotId={liveState.snapshot_id}
        timestamp={liveState.timestamp}
      />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
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

        <CorridorMap
          selectedCity={selectedCity}
          onCityChange={(city) => updateConfig({ selectedCity: city })}
        />

        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Zone Overview</h2>
          {displayZones.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No zones available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayZones.map((zone) => (
                <ZoneTile key={zone.zone_id} zone={zone as any} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {firstZone && (firstZone as any).forecast_30m?.length > 0 && (
            <ForecastChart
              data={(firstZone as any).forecast_30m}
              title={`Risk Forecast — ${firstZone.name}`}
            />
          )}
          <InterventionsTable interventions={allInterventions} />
        </div>
      </div>
    </div>
  );
}
