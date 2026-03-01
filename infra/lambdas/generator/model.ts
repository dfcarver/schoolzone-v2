import { ZoneDef } from "./zones";

export interface ZoneTelemetry {
  riskScore: number;
  vehicleCount: number;
  pedestrianCount: number;
  speedAvgMph: number;
  congestionIndex: number;
  activeCameras: number;
  totalCameras: number;
}

export type WeatherCondition = "clear" | "rain" | "fog";

const WEATHER_MULTIPLIERS: Record<WeatherCondition, { congestion: number; speed: number }> = {
  clear: { congestion: 1.0, speed: 0 },
  rain:  { congestion: 1.35, speed: 5 },
  fog:   { congestion: 1.25, speed: 8 },
};

// Dismissal times in minutes from midnight
const DISMISSAL_MIN: Record<ZoneDef["type"], number> = {
  elementary: 15 * 60,        // 3:00 PM
  middle:     15 * 60 + 15,   // 3:15 PM
  high:       15 * 60 + 30,   // 3:30 PM
};

const DROPOFF_MIN = 7 * 60 + 45; // 7:45 AM morning drop-off

function bell(x: number, center: number, sigma: number): number {
  return Math.exp(-0.5 * ((x - center) / sigma) ** 2);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function noise(scale: number): number {
  return (Math.random() - 0.5) * scale;
}

/**
 * Compute simulated zone telemetry for a given point in time.
 * Uses the same Gaussian peak model as the front-end congestion engine,
 * but runs server-side in Lambda and writes real time-series data.
 */
export function computeZoneTelemetry(
  zone: ZoneDef,
  now: Date,
  weather: WeatherCondition = "clear"
): ZoneTelemetry {
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wm = WEATHER_MULTIPLIERS[weather];

  const dismissalMin = DISMISSAL_MIN[zone.type];
  const maxParents = zone.enrollment * 0.65; // ~65% picked up by car

  // Vehicle count — Gaussian peaks at dismissal and morning drop-off
  const dismissalPeak = maxParents * bell(minuteOfDay, dismissalMin, 15);
  const morningPeak   = maxParents * 0.75 * bell(minuteOfDay, DROPOFF_MIN, 12);
  const baseTraffic   = zone.enrollment * 0.03;
  const rawVehicles   = (dismissalPeak + morningPeak + baseTraffic + noise(maxParents * 0.04)) * wm.congestion;
  const vehicleCount  = Math.max(0, Math.round(rawVehicles));

  // Congestion index (0–1)
  const congestionIndex = clamp(vehicleCount / maxParents, 0, 1);

  // Speed: 25 mph free-flow, down to ~10 mph at full congestion + weather penalty
  const speedAvgMph = Math.max(
    5,
    Math.round(25 - congestionIndex * 15 - wm.speed + noise(2))
  );

  // Pedestrian count — peaks sharply at dismissal
  const pedestrianCount = Math.max(
    0,
    Math.round(zone.enrollment * 0.35 * bell(minuteOfDay, dismissalMin, 10) + noise(5))
  );

  // Risk score: congestion (50%) + speed (30%) + pedestrian density (20%)
  const pedestrianFactor = pedestrianCount / Math.max(1, zone.enrollment * 0.35);
  const riskScore = clamp(
    congestionIndex * 0.5 +
    (1 - speedAvgMph / 25) * 0.3 +
    pedestrianFactor * 0.2,
    0,
    1
  );

  return {
    riskScore:        Math.round(riskScore       * 1000) / 1000,
    vehicleCount,
    pedestrianCount,
    speedAvgMph,
    congestionIndex:  Math.round(congestionIndex * 1000) / 1000,
    activeCameras:    zone.cameras,
    totalCameras:     zone.cameras,
  };
}

/**
 * Project telemetry forward in time to produce a 30-minute forecast.
 * Returns 6 points at 5-minute intervals.
 */
export function computeForecast(
  zone: ZoneDef,
  now: Date,
  weather: WeatherCondition = "clear"
): Array<{ time: string; risk: number; confidence: number }> {
  return Array.from({ length: 6 }, (_, i) => {
    const futureTime = new Date(now.getTime() + (i + 1) * 5 * 60_000);
    const tel = computeZoneTelemetry(zone, futureTime, weather);
    return {
      time:       futureTime.toISOString(),
      risk:       tel.riskScore,
      confidence: Math.max(0.55, 1 - (i + 1) * 0.06), // confidence decays with horizon
    };
  });
}
