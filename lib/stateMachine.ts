import {
  LiveState,
  ZoneLiveState,
  Intervention,
  ZoneEvent,
  Recommendation,
  SnapshotPhase,
} from "./types";

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
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
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
    return {
      ...zone,
      interventions: [...zone.interventions, newIntervention],
      events: [...zone.events, newEvent],
    };
  });

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

    return {
      ...snapshotZone,
      interventions: [...snapshotZone.interventions, ...demoInterventions],
      events: [...snapshotZone.events, ...demoEvents],
    };
  });

  return {
    ...snapshot,
    zones: mergedZones,
  };
}
