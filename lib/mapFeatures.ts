import { Incident } from "./types";

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

export type WeatherCondition = "clear" | "rain" | "snow" | "fog";

export interface WeatherProfile {
  label: string;
  icon: string;
  congestionMultiplier: number;
  speedReduction: number; // mph reduction
  visibilityNote: string;
}

export const WEATHER_PROFILES: Record<WeatherCondition, WeatherProfile> = {
  clear: {
    label: "Clear",
    icon: "☀️",
    congestionMultiplier: 1.0,
    speedReduction: 0,
    visibilityNote: "Normal visibility",
  },
  rain: {
    label: "Rain",
    icon: "🌧️",
    congestionMultiplier: 1.35,
    speedReduction: 5,
    visibilityNote: "Reduced visibility — wet roads increase stopping distance",
  },
  snow: {
    label: "Snow",
    icon: "❄️",
    congestionMultiplier: 1.6,
    speedReduction: 10,
    visibilityNote: "Poor visibility — icy conditions, expect delays",
  },
  fog: {
    label: "Fog",
    icon: "🌫️",
    congestionMultiplier: 1.25,
    speedReduction: 8,
    visibilityNote: "Low visibility — reduced sight lines at crosswalks",
  },
};

// ---------------------------------------------------------------------------
// Geofence
// ---------------------------------------------------------------------------

export interface GeofenceConfig {
  zoneId: string;
  radiusMeters: number;
  congestionThreshold: number; // 0–1: triggers alert above this
  speedLimitMph: number;
  enabled: boolean;
}

export const DEFAULT_GEOFENCES: GeofenceConfig[] = [
  { zoneId: "zone-001", radiusMeters: 300, congestionThreshold: 0.6, speedLimitMph: 20, enabled: true },
  { zoneId: "zone-002", radiusMeters: 350, congestionThreshold: 0.55, speedLimitMph: 20, enabled: true },
  { zoneId: "zone-003", radiusMeters: 400, congestionThreshold: 0.5, speedLimitMph: 20, enabled: true },
  { zoneId: "zone-004", radiusMeters: 280, congestionThreshold: 0.6, speedLimitMph: 20, enabled: true },
  { zoneId: "zone-005", radiusMeters: 320, congestionThreshold: 0.55, speedLimitMph: 20, enabled: true },
];

// ---------------------------------------------------------------------------
// Parent Flow
// ---------------------------------------------------------------------------

export interface ParentFlowSnapshot {
  minuteOfDay: number;
  queueLength: number;    // vehicles in queue
  waitTimeMin: number;     // estimated wait in minutes
  arrivalRate: number;     // vehicles per minute arriving
  departureRate: number;   // vehicles per minute departing
}

/**
 * Model parent arrival queue for a school at a given time.
 * Uses a Gaussian arrival distribution centered on dismissal time,
 * with queue length proportional to enrollment.
 */
export function computeParentFlow(
  enrollment: number,
  schoolType: string,
  minuteOfDay: number
): ParentFlowSnapshot {
  // Dismissal times by school type (minutes from midnight)
  const dismissalMin: Record<string, number> = {
    elementary: 15 * 60,       // 3:00 PM
    middle: 15 * 60 + 15,     // 3:15 PM
    high: 15 * 60 + 30,       // 3:30 PM
  };

  const dismissal = dismissalMin[schoolType] ?? 15 * 60;

  // Parents start arriving ~20 min before dismissal, peak at dismissal
  const parentPct = 0.65; // ~65% of students picked up by car
  const totalParents = Math.round(enrollment * parentPct);

  // Arrival distribution: Gaussian centered 5 min before dismissal
  const arrivalCenter = dismissal - 5;
  const arrivalSpread = 12; // minutes
  const d = (minuteOfDay - arrivalCenter) / arrivalSpread;
  const arrivalDensity = Math.exp(-0.5 * d * d);

  // Departure distribution: ramp up starting at dismissal
  const timeSinceDismissal = minuteOfDay - dismissal;
  const departureDensity = timeSinceDismissal > 0
    ? Math.min(1, timeSinceDismissal / 15) // full departure rate after 15 min
    : 0;

  const peakArrivalRate = totalParents / (arrivalSpread * 2.5); // vehicles/min at peak
  const arrivalRate = Math.round(peakArrivalRate * arrivalDensity * 10) / 10;

  const peakDepartureRate = peakArrivalRate * 1.2; // slightly faster departure
  const departureRate = Math.round(peakDepartureRate * departureDensity * 10) / 10;

  // Queue accumulation: integral of (arrivals - departures) over time
  // Simplified: model as buildup before dismissal, drain after
  const minutesBeforeDismissal = dismissal - minuteOfDay;
  let queueLength: number;

  if (minuteOfDay < dismissal - 25) {
    queueLength = 0; // too early
  } else if (minuteOfDay < dismissal) {
    // Building phase
    const buildupProgress = 1 - minutesBeforeDismissal / 25;
    queueLength = Math.round(totalParents * 0.4 * buildupProgress * buildupProgress);
  } else if (minuteOfDay < dismissal + 20) {
    // Peak + draining phase
    const drainProgress = timeSinceDismissal / 20;
    queueLength = Math.round(totalParents * 0.4 * (1 - drainProgress * drainProgress));
  } else {
    queueLength = Math.max(0, Math.round(totalParents * 0.05 * Math.exp(-(timeSinceDismissal - 20) / 10)));
  }

  // Wait time estimate: ~30 seconds per car in queue ahead
  const waitTimeMin = Math.round((queueLength * 0.5) * 10) / 10;

  return { minuteOfDay, queueLength, waitTimeMin, arrivalRate, departureRate };
}

// ---------------------------------------------------------------------------
// What-If Scenario Presets
// ---------------------------------------------------------------------------

export type WhatIfScenarioId =
  | "dismissal_early_30"
  | "dismissal_late_30"
  | "add_crossing_guard"
  | "signal_timing"
  | "traffic_diversion"
  | "staggered_dismissal";

export interface WhatIfScenario {
  id: WhatIfScenarioId;
  label: string;
  description: string;
  dismissalShiftMin: number;        // shift dismissal time (0 = no shift)
  congestionReduction: number;      // 0–1 fractional reduction in peak congestion
  peakSpreadIncrease: number;       // minutes added to peak spread (flattening)
}

export const WHAT_IF_SCENARIOS: WhatIfScenario[] = [
  {
    id: "dismissal_early_30",
    label: "Dismissal 30 min earlier",
    description: "Shift all school dismissals 30 minutes earlier to avoid afternoon traffic buildup",
    dismissalShiftMin: -30,
    congestionReduction: 0,
    peakSpreadIncrease: 0,
  },
  {
    id: "dismissal_late_30",
    label: "Dismissal 30 min later",
    description: "Shift all school dismissals 30 minutes later to deconflict with commuter traffic",
    dismissalShiftMin: 30,
    congestionReduction: 0,
    peakSpreadIncrease: 0,
  },
  {
    id: "add_crossing_guard",
    label: "Add crossing guard",
    description: "Deploy a crossing guard at the primary intersection — reduces pedestrian-vehicle conflicts",
    dismissalShiftMin: 0,
    congestionReduction: 0.15,
    peakSpreadIncrease: 0,
  },
  {
    id: "signal_timing",
    label: "Optimize signal timing",
    description: "Adjust traffic signal timing to prioritize school zone flow during peak windows",
    dismissalShiftMin: 0,
    congestionReduction: 0.2,
    peakSpreadIncrease: 5,
  },
  {
    id: "traffic_diversion",
    label: "Traffic diversion",
    description: "Divert through-traffic to alternate routes during school hours",
    dismissalShiftMin: 0,
    congestionReduction: 0.3,
    peakSpreadIncrease: 0,
  },
  {
    id: "staggered_dismissal",
    label: "Staggered dismissal",
    description: "Stagger dismissal times by 15 minutes across grade levels to flatten peak congestion",
    dismissalShiftMin: 0,
    congestionReduction: 0.1,
    peakSpreadIncrease: 15,
  },
];

// ---------------------------------------------------------------------------
// Dispatched Intervention
// ---------------------------------------------------------------------------

export type DispatchStatus = "dispatched" | "en_route" | "on_scene" | "completed";

export interface DispatchedIntervention {
  id: string;
  corridorId: string;
  corridorName: string;
  type: "SIGNAL_TIMING" | "TRAFFIC_DIVERSION" | "ENFORCEMENT" | "CROSSING_GUARD";
  status: DispatchStatus;
  dispatchedAt: number; // timestamp
  description: string;
}

export const INTERVENTION_OPTIONS = [
  { type: "CROSSING_GUARD" as const, label: "Deploy Crossing Guard", icon: "🚶", eta: "4 min" },
  { type: "ENFORCEMENT" as const, label: "Dispatch Traffic Officer", icon: "👮", eta: "6 min" },
  { type: "SIGNAL_TIMING" as const, label: "Adjust Signal Timing", icon: "🚦", eta: "Immediate" },
  { type: "TRAFFIC_DIVERSION" as const, label: "Activate Traffic Diversion", icon: "↩️", eta: "2 min" },
];

// ---------------------------------------------------------------------------
// Incident mapping — assign lat/lng from school data
// ---------------------------------------------------------------------------

export interface MappedIncident extends Incident {
  lat: number;
  lng: number;
}

const SCHOOL_COORDS: Record<string, { lat: number; lng: number }> = {
  "zone-001": { lat: 39.7817, lng: -89.6501 },
  "zone-002": { lat: 39.7900, lng: -89.6440 },
  "zone-003": { lat: 39.7755, lng: -89.6580 },
  "zone-004": { lat: 39.7832, lng: -89.6390 },
  "zone-005": { lat: 39.7950, lng: -89.6520 },
};

export function mapIncidentsToCoords(incidents: Incident[]): MappedIncident[] {
  return incidents
    .filter((inc) => SCHOOL_COORDS[inc.zone_id])
    .map((inc) => ({
      ...inc,
      // Offset slightly so incidents don't overlap school markers
      lat: SCHOOL_COORDS[inc.zone_id].lat + (Math.random() - 0.5) * 0.002,
      lng: SCHOOL_COORDS[inc.zone_id].lng + (Math.random() - 0.5) * 0.002,
    }));
}
