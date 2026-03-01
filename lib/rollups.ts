import { LiveState, ZoneLiveState, ForecastPoint, RiskLevel } from "./types";
import { ValidationResult } from "./validate";
import { getMetrics } from "./metrics";

export type GovernanceStatus = "GREEN" | "AMBER" | "RED";

export interface DistrictRollup {
  districtRiskIndex: number;
  forecastedHighRiskWindow: string;
  forecastedHighRiskValue: number;
  interventionsAppliedToday: number;
  effectiveness: number;
  governanceStatus: GovernanceStatus;
}

export interface ZoneHeatmapEntry {
  zone_id: string;
  name: string;
  riskNow: number;
  risk15: number;
  risk30: number;
  risk_level: RiskLevel;
  hasActiveIntervention: boolean;
}

export interface EmergingRisk {
  zone_id: string;
  zoneName: string;
  peakRisk: number;
  peakTime: string;
}

export interface ActiveMitigation {
  zone_id: string;
  zoneName: string;
  action: string;
  appliedAt: string;
  isOperatorDispatched: boolean;
}

export function computeDistrictRollup(
  liveState: LiveState,
  lastValidation: ValidationResult | null,
  driftStatus: "NORMAL" | "WARNING" | "DRIFT"
): DistrictRollup {
  const zones = liveState.zones;

  // District Risk Index: avg of top N risk scores * 100
  const scores = zones.map((z) => z.risk_score).sort((a, b) => b - a);
  const topN = scores.slice(0, Math.max(3, Math.ceil(scores.length / 2)));
  const districtRiskIndex = topN.length > 0
    ? Math.round((topN.reduce((s, v) => s + v, 0) / topN.length) * 100)
    : 0;

  // Forecasted high-risk window
  let peakRisk = 0;
  let peakTime = "";
  for (const zone of zones) {
    for (const fp of zone.forecast_30m) {
      if (fp.risk > peakRisk) {
        peakRisk = fp.risk;
        peakTime = fp.time;
      }
    }
  }
  const forecastedHighRiskWindow = peakTime ? `~${peakTime}` : "N/A";
  const forecastedHighRiskValue = Math.round(peakRisk * 100);

  // Interventions applied today
  const interventionsAppliedToday = zones.reduce(
    (acc, z) => acc + z.interventions.length,
    0
  );

  // Effectiveness: simulated delta based on interventions
  const effectiveness = computeEffectiveness(zones);

  // Governance status
  const metrics = getMetrics();
  const governanceStatus = deriveGovernanceStatus(
    lastValidation,
    driftStatus,
    metrics.fetchErrorCount
  );

  return {
    districtRiskIndex,
    forecastedHighRiskWindow,
    forecastedHighRiskValue,
    interventionsAppliedToday,
    effectiveness,
    governanceStatus,
  };
}

function computeEffectiveness(zones: ZoneLiveState[]): number {
  // Deterministic: for each zone with interventions, estimate risk reduction
  let totalReduction = 0;
  let zonesWithInterventions = 0;

  for (const zone of zones) {
    if (zone.interventions.length === 0) continue;
    zonesWithInterventions++;
    // Estimate: each intervention reduces risk by ~12% of current score
    const reductionPerIntervention = 0.12;
    const zoneReduction = Math.min(
      zone.interventions.length * reductionPerIntervention,
      0.4
    );
    totalReduction += zoneReduction;
  }

  if (zonesWithInterventions === 0) return 0;
  return Math.round((totalReduction / zonesWithInterventions) * 100);
}

function deriveGovernanceStatus(
  validation: ValidationResult | null,
  driftStatus: "NORMAL" | "WARNING" | "DRIFT",
  fetchErrorCount: number
): GovernanceStatus {
  if (!validation || !validation.valid || driftStatus === "DRIFT" || fetchErrorCount > 5) {
    return "RED";
  }
  if (validation.warnings.length > 0 || driftStatus === "WARNING" || fetchErrorCount > 2) {
    return "AMBER";
  }
  return "GREEN";
}

export function computeHeatmap(liveState: LiveState): ZoneHeatmapEntry[] {
  return liveState.zones.map((zone) => {
    const fc = zone.forecast_30m;
    return {
      zone_id: zone.zone_id,
      name: zone.name,
      riskNow: Math.round(zone.risk_score * 100),
      risk15: fc.length >= 4 ? Math.round(fc[3].risk * 100) : Math.round(zone.risk_score * 100),
      risk30: fc.length >= 7 ? Math.round(fc[6].risk * 100) : Math.round(zone.risk_score * 100),
      risk_level: zone.risk_level,
      hasActiveIntervention: zone.interventions.some((i) => i.id.startsWith("demo-int-")),
    };
  });
}

export function computeEmergingRisks(liveState: LiveState): EmergingRisk[] {
  const risks: EmergingRisk[] = liveState.zones.map((zone) => {
    let peakRisk = 0;
    let peakTime = "";
    for (const fp of zone.forecast_30m) {
      if (fp.risk > peakRisk) {
        peakRisk = fp.risk;
        peakTime = fp.time;
      }
    }
    return {
      zone_id: zone.zone_id,
      zoneName: zone.name,
      peakRisk,
      peakTime,
    };
  });

  return risks.sort((a, b) => b.peakRisk - a.peakRisk).slice(0, 3);
}

export function computeActiveMitigations(liveState: LiveState): ActiveMitigation[] {
  const mitigations: ActiveMitigation[] = [];
  for (const zone of liveState.zones) {
    for (const intervention of zone.interventions) {
      mitigations.push({
        zone_id: zone.zone_id,
        zoneName: zone.name,
        action: intervention.action,
        appliedAt: intervention.applied_at,
        isOperatorDispatched: intervention.id.startsWith("demo-int-"),
      });
    }
  }
  // Most recent first, operator-dispatched before non-operator at the same time
  mitigations.sort((a, b) => {
    if (a.isOperatorDispatched !== b.isOperatorDispatched) {
      return Number(b.isOperatorDispatched) - Number(a.isOperatorDispatched);
    }
    return b.appliedAt.localeCompare(a.appliedAt);
  });
  return mitigations.slice(0, 6);
}

export function deriveDriftStatus(
  liveState: LiveState
): "NORMAL" | "WARNING" | "DRIFT" {
  // Deterministic drift detection based on data characteristics
  const cameraHealthy = liveState.camera_health_pct >= 90;
  const latencyOk = liveState.avg_latency_ms <= 200;
  const allZonesHaveForecast = liveState.zones.every(
    (z) => z.forecast_30m.length > 0
  );

  if (!cameraHealthy && !latencyOk) return "DRIFT";
  if (!cameraHealthy || !latencyOk || !allZonesHaveForecast) return "WARNING";
  return "NORMAL";
}
