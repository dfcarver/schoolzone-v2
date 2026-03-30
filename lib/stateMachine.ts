import {
  LiveState,
  ZoneLiveState,
  Intervention,
  ZoneEvent,
  Recommendation,
  SnapshotPhase,
  deriveRiskLevel,
  RiskLevel,
} from "./types";
import { recordDemoMutation } from "./metrics";
import * as logger from "./logger";

export function nextSnapshotPhase(current: SnapshotPhase): SnapshotPhase {
  switch (current) {
    case SnapshotPhase.INITIAL:
      return SnapshotPhase.SNAPSHOT_1;
    case SnapshotPhase.SNAPSHOT_1:
      return SnapshotPhase.SNAPSHOT_2;
    case SnapshotPhase.SNAPSHOT_2:
      return SnapshotPhase.SNAPSHOT_1;
  }
}

export function snapshotFile(phase: SnapshotPhase): string {
  switch (phase) {
    case SnapshotPhase.INITIAL:
    case SnapshotPhase.SNAPSHOT_1:
      return "live_state_1.json";
    case SnapshotPhase.SNAPSHOT_2:
      return "live_state_2.json";
  }
}

export function applyDemoIntervention(
  liveState: LiveState,
  zoneId: string,
  recommendation: Recommendation
): LiveState {
  const now = new Date();
  const timeStr = [
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join(":");

  const newIntervention: Intervention = {
    id: `demo-int-${Date.now()}`,
    action: recommendation.action,
    applied_at: timeStr,
    status: "active",
  };

  const newEvent: ZoneEvent = {
    time: timeStr,
    type: "intervention",
    detail: `[Demo] Applied: ${recommendation.action}`,
  };

  const updatedZones: ZoneLiveState[] = liveState.zones.map((zone) => {
    if (zone.zone_id !== zoneId) return zone;

    // Reduce risk score: HIGH-priority recs cut more, scaled by confidence.
    // Floor at 0.22 so stacked interventions never collapse to 0%.
    const baseCut = recommendation.priority === RiskLevel.HIGH ? 0.20 : 0.13;
    const reduction = baseCut * recommendation.confidence;
    const newScore = Math.max(0.22, Math.round((zone.risk_score - reduction) * 1000) / 1000);
    const newLevel = deriveRiskLevel(newScore);

    // Apply the same proportional reduction to the 30-min forecast
    const scaleFactor = zone.risk_score > 0 ? newScore / zone.risk_score : 1;
    const newForecast = zone.forecast_30m.map((fp) => ({
      ...fp,
      risk: Math.round(fp.risk * scaleFactor * 1000) / 1000,
    }));

    return {
      ...zone,
      risk_score: newScore,
      risk_level: newLevel,
      forecast_30m: newForecast,
      interventions: [...zone.interventions, newIntervention],
      events: [...zone.events, newEvent],
    };
  });

  recordDemoMutation();
  logger.info(`Demo intervention applied: ${recommendation.action} in ${zoneId}`);

  return {
    ...liveState,
    zones: updatedZones,
  };
}

export function mergeSnapshotWithOverrides(
  snapshot: LiveState,
  overrides: LiveState | null
): LiveState {
  if (!overrides) return snapshot;

  const overrideZoneMap = new Map<string, ZoneLiveState>();
  for (const z of overrides.zones) {
    overrideZoneMap.set(z.zone_id, z);
  }

  const mergedZones: ZoneLiveState[] = snapshot.zones.map((snapshotZone) => {
    const override = overrideZoneMap.get(snapshotZone.zone_id);
    if (!override) return snapshotZone;

    const demoInterventions = override.interventions.filter((i) =>
      i.id.startsWith("demo-int-")
    );
    const demoEvents = override.events.filter((e) =>
      e.detail.startsWith("[Demo]")
    );

    if (demoInterventions.length === 0 && demoEvents.length === 0) {
      return snapshotZone;
    }

    // Carry forward risk reduction: use override's score if it's lower than the fresh snapshot
    const effectiveScore = override.risk_score < snapshotZone.risk_score
      ? override.risk_score
      : snapshotZone.risk_score;
    const effectiveLevel = deriveRiskLevel(effectiveScore);

    // Scale forecast proportionally to the effective score
    const scaleFactor = snapshotZone.risk_score > 0 ? effectiveScore / snapshotZone.risk_score : 1;
    const effectiveForecast = scaleFactor < 1
      ? snapshotZone.forecast_30m.map((fp) => ({ ...fp, risk: Math.round(fp.risk * scaleFactor * 1000) / 1000 }))
      : snapshotZone.forecast_30m;

    return {
      ...snapshotZone,
      risk_score: effectiveScore,
      risk_level: effectiveLevel,
      forecast_30m: effectiveForecast,
      interventions: [...snapshotZone.interventions, ...demoInterventions],
      events: [...snapshotZone.events, ...demoEvents],
    };
  });

  const activeAlerts = mergedZones.filter(z => z.risk_level === RiskLevel.HIGH).length;

  return {
    ...snapshot,
    active_alerts: activeAlerts,
    zones: mergedZones,
  };
}
