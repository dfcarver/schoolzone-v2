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
import type { ScenarioId } from "./demoConfig";
import { CITIES } from "./cityConfig";
import { getCongestionForCorridor } from "./hooks/useCongestionEngine";
import { WEATHER_PROFILES, type WeatherCondition } from "./mapFeatures";

// Per-scenario risk multipliers applied on top of live Lambda data.
// "normal" is the baseline — no change.
const SCENARIO_MULTIPLIERS: Record<ScenarioId, number> = {
  normal:    1.00,
  surge:     1.38,
  weather:   1.22,
  dismissal: 1.48,
};

// Minimum risk floor per scenario — ensures visible change regardless of time of day.
// Without a floor, multiplying 15% × 1.48 still looks like 22%, which appears unchanged.
const SCENARIO_FLOORS: Record<ScenarioId, number> = {
  normal:    0,
  surge:     0.42,
  weather:   0.32,
  dismissal: 0.52,
};

// Additional context injected into each zone per scenario (for realism).
const SCENARIO_ZONE_OVERRIDES: Record<ScenarioId, Partial<ZoneLiveState>> = {
  normal:    {},
  surge:     { pedestrian_count: undefined }, // computed below
  weather:   { active_cameras: undefined },   // computed below
  dismissal: { pedestrian_count: undefined }, // computed below
};

export function applyScenarioOverlay(state: LiveState, scenario: ScenarioId): LiveState {
  if (scenario === "normal") return state;

  const multiplier = SCENARIO_MULTIPLIERS[scenario];

  const zones: ZoneLiveState[] = state.zones.map((zone) => {
    const rawScore  = Math.min(0.97, Math.max(SCENARIO_FLOORS[scenario], zone.risk_score * multiplier));
    const newScore  = Math.round(rawScore * 1000) / 1000;
    const newLevel  = deriveRiskLevel(newScore);
    const scaleFactor = zone.risk_score > 0 ? newScore / zone.risk_score : 1;

    const floor = SCENARIO_FLOORS[scenario];
    const newForecast = zone.forecast_30m.map((fp) => ({
      ...fp,
      risk: Math.min(0.97, Math.max(floor, Math.round(fp.risk * scaleFactor * 1000) / 1000)),
    }));

    // Scenario-specific sensor/activity tweaks
    let extra: Partial<ZoneLiveState> = {};
    if (scenario === "surge") {
      extra = {
        pedestrian_count: Math.round(zone.pedestrian_count * 1.6),
        speed_avg_mph: Math.max(5, Math.round(zone.speed_avg_mph * 0.65)),
      };
    } else if (scenario === "dismissal") {
      extra = {
        pedestrian_count: Math.round(zone.pedestrian_count * 2.2),
        speed_avg_mph: Math.max(5, Math.round(zone.speed_avg_mph * 0.55)),
      };
    } else if (scenario === "weather") {
      extra = {
        active_cameras: Math.max(1, Math.floor(zone.active_cameras * 0.7)),
        speed_avg_mph: Math.max(5, Math.round(zone.speed_avg_mph * 0.75)),
      };
    }

    return { ...zone, ...extra, risk_score: newScore, risk_level: newLevel, forecast_30m: newForecast };
  });

  return {
    ...state,
    active_alerts: zones.filter((z) => z.risk_level === RiskLevel.HIGH).length,
    zones,
  };
}

/**
 * Blends congestion-model risk (computed from simTimeMin) into live state.
 * Takes the MAX of Lambda risk and congestion-model risk so that when the
 * time slider is at peak hours (e.g. 3:15 PM dismissal), risk scores rise
 * to match what the parent queue panel is showing.
 */
export function applyCongestionTimeBlend(
  state: LiveState,
  simTimeMin: number,
  city: string,
  weather: string
): LiveState {
  const cityConfig = CITIES.find((c) => c.id === city);
  if (!cityConfig) return state;

  const weatherMultiplier = (WEATHER_PROFILES[weather as WeatherCondition]?.congestionMultiplier) ?? 1.0;
  const corridorMap = new Map(cityConfig.corridors.map((c) => [c.school.zone_id, c]));

  let changed = false;
  const zones: ZoneLiveState[] = state.zones.map((zone) => {
    const corridor = corridorMap.get(zone.zone_id);
    if (!corridor) return zone;

    const congestion = getCongestionForCorridor(corridor, simTimeMin, weatherMultiplier, null);
    if (congestion <= zone.risk_score) return zone;

    changed = true;
    const newScore = Math.round(Math.min(0.97, congestion) * 1000) / 1000;
    const newLevel = deriveRiskLevel(newScore);
    const scaleFactor = zone.risk_score > 0 ? newScore / zone.risk_score : 1;
    const newForecast = zone.forecast_30m.map((fp) => ({
      ...fp,
      risk: Math.min(0.97, Math.round(fp.risk * scaleFactor * 1000) / 1000),
    }));
    return { ...zone, risk_score: newScore, risk_level: newLevel, forecast_30m: newForecast };
  });

  if (!changed) return state;
  return {
    ...state,
    active_alerts: zones.filter((z) => z.risk_level === RiskLevel.HIGH).length,
    zones,
  };
}

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
