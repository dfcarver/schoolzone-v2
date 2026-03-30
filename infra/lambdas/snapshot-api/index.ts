import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { ZONES, ZoneDef } from "../generator/zones";
import { computeZoneTelemetry, computeForecast, WeatherCondition } from "../generator/model";

const ddb   = new DynamoDBClient({});
const TABLE = process.env.DYNAMODB_TABLE!;

// ── Types matching the Next.js app's LiveState contract ───────────────────────

type RiskLevel = "LOW" | "MED" | "HIGH";

function riskLevel(score: number): RiskLevel {
  if (score < 0.4) return "LOW";
  if (score < 0.7) return "MED";
  return "HIGH";
}

interface DynamoZoneRow {
  zone_id:          string;
  zone_name:        string;
  risk_score:       number;
  vehicle_count:    number;
  pedestrian_count: number;
  speed_avg_mph:    number;
  congestion_index: number;
  active_cameras:   number;
  total_cameras:    number;
}

// ── Abu Dhabi demo realism ────────────────────────────────────────────────────

interface ZoneOverride {
  riskFloor:     number;
  riskCeiling:   number;
  activeCameras?: number;
}

const ZONE_OVERRIDES: Record<string, ZoneOverride> = {
  "khalifa-002": { riskFloor: 0.72, riskCeiling: 0.81 }, // persistently high-risk school
  "khalifa-003": { riskFloor: 0.35, riskCeiling: 0.65, activeCameras: 5 }, // one camera offline
  "mbz-001":     { riskFloor: 0.30, riskCeiling: 0.58 },
};

interface SyntheticEvent {
  offsetMin: number; // minutes before simulated now
  type:      string;
  detail:    string;
}

const SYNTHETIC_EVENTS: Record<string, SyntheticEvent[]> = {
  "khalifa-002": [
    { offsetMin: 22, type: "alert",    detail: "Speed violation: 47 km/h recorded in 20 km/h school zone" },
    { offsetMin: 14, type: "vehicle",  detail: "Vehicle blocking school gate — dismissal lane congested" },
    { offsetMin:  8, type: "alert",    detail: "Pedestrian density HIGH: 190+ students in active crossing zone" },
    { offsetMin:  3, type: "vehicle",  detail: "Queue extending onto Khalifa St — 28 vehicles waiting" },
  ],
  "khalifa-001": [
    { offsetMin: 31, type: "camera",   detail: "Camera 6 feed restored after 4-min signal outage" },
    { offsetMin: 19, type: "vehicle",  detail: "Drop-off queue extending onto service road" },
    { offsetMin:  6, type: "alert",    detail: "Unaccompanied minor detected at north gate — security notified" },
  ],
  "khalifa-003": [
    { offsetMin: 45, type: "camera",   detail: "Camera 4 offline — maintenance request raised (ticket #1847)" },
    { offsetMin: 17, type: "alert",    detail: "Unplanned road closure: Al Reem Blvd intersection, rerouting active" },
    { offsetMin:  9, type: "vehicle",  detail: "Bus convoy running 11 min late — 3 buses affected" },
  ],
  "mbz-001": [
    { offsetMin: 28, type: "vehicle",  detail: "School bus convoy delay: 4 buses running 8 min behind schedule" },
    { offsetMin: 11, type: "alert",    detail: "Pedestrian signal malfunction at east entrance — manual control active" },
  ],
  "mbz-002": [
    { offsetMin: 36, type: "camera",   detail: "Camera 2 repositioned — field of view expanded to cover new gate" },
    { offsetMin: 12, type: "vehicle",  detail: "Elevated vehicle count: 94 vehicles in 10-min window" },
  ],
  "mbz-003": [
    { offsetMin: 24, type: "alert",    detail: "Weather advisory: reduced visibility, speed enforcement active" },
    { offsetMin:  7, type: "vehicle",  detail: "Parent double-parking incident — crossing guard deployed" },
  ],
};

const SYNTHETIC_RECOMMENDATIONS: Record<string, Array<{ action: string; impact: string; confidence: number; priority: RiskLevel }>> = {
  "khalifa-002": [
    { action: "Deploy crossing guard to school gate",          impact: "Reduce pedestrian-vehicle conflicts ~40%", confidence: 0.91, priority: "HIGH" },
    { action: "Activate dynamic speed signs on Khalifa St",   impact: "Expected 25% speed reduction in zone",     confidence: 0.85, priority: "HIGH" },
    { action: "Send parent notification: staggered pick-up",  impact: "Reduce peak congestion window by 15 min",  confidence: 0.78, priority: "MED"  },
  ],
  "khalifa-001": [
    { action: "Extend drop-off lane capacity by 30m",         impact: "Absorb 40% more vehicles per cycle",       confidence: 0.83, priority: "MED"  },
    { action: "Activate variable message sign: use side gate",impact: "Reduce main gate load by 35%",             confidence: 0.80, priority: "MED"  },
  ],
  "khalifa-003": [
    { action: "Request police patrol for Al Reem closure",    impact: "Restore normal flow within 20 min",        confidence: 0.88, priority: "HIGH" },
    { action: "Dispatch maintenance to repair Camera 4",      impact: "Restore full surveillance coverage",       confidence: 0.95, priority: "MED"  },
  ],
  "mbz-001": [
    { action: "Notify bus operator: prioritise Zone 1 routes",impact: "Reduce dismissal congestion by ~20 min",   confidence: 0.76, priority: "MED"  },
    { action: "Repair pedestrian signal at east entrance",    impact: "Eliminate manual control requirement",     confidence: 0.97, priority: "HIGH" },
  ],
  "mbz-003": [
    { action: "Deploy crossing guard: double-parking zone",   impact: "Clear obstruction within 5 min",           confidence: 0.89, priority: "MED"  },
  ],
};

function buildSyntheticEvents(zoneId: string, now: Date) {
  const events = SYNTHETIC_EVENTS[zoneId];
  if (!events) return [];
  return events.map(({ offsetMin, type, detail }) => {
    const t = new Date(now.getTime() - offsetMin * 60_000);
    const hh = String(t.getUTCHours()).padStart(2, "0");
    const mm = String(t.getUTCMinutes()).padStart(2, "0");
    const ss = String(t.getUTCSeconds()).padStart(2, "0");
    return { time: `${hh}:${mm}:${ss}`, type, detail };
  });
}

function addNoise(value: number, scale: number): number {
  return value + (Math.random() - 0.5) * scale;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Query DynamoDB for all zones in a city.
 * Returns a map of zone_id → latest telemetry row.
 */
async function queryZoneState(cityId: string): Promise<Map<string, DynamoZoneRow>> {
  const result = await ddb.send(new QueryCommand({
    TableName:                TABLE,
    KeyConditionExpression:   "city_id = :city",
    ExpressionAttributeValues: { ":city": { S: cityId } },
  }));

  const map = new Map<string, DynamoZoneRow>();
  for (const item of result.Items ?? []) {
    const zoneId = item.zone_id?.S;
    if (!zoneId) continue;
    map.set(zoneId, {
      zone_id:          zoneId,
      zone_name:        item.zone_name?.S        ?? "",
      risk_score:       parseFloat(item.risk_score?.N        ?? "0"),
      vehicle_count:    parseInt(item.vehicle_count?.N       ?? "0", 10),
      pedestrian_count: parseInt(item.pedestrian_count?.N    ?? "0", 10),
      speed_avg_mph:    parseFloat(item.speed_avg_mph?.N     ?? "20"),
      congestion_index: parseFloat(item.congestion_index?.N  ?? "0"),
      active_cameras:   parseInt(item.active_cameras?.N      ?? "0", 10),
      total_cameras:    parseInt(item.total_cameras?.N       ?? "0", 10),
    });
  }
  return map;
}

function buildZoneState(zone: ZoneDef, row: DynamoZoneRow | undefined, now: Date, weather: WeatherCondition) {
  let riskScore: number, vehicleCount: number, pedestrianCount: number;
  let speedAvgMph: number, congestionIndex: number, activeCameras: number, totalCameras: number;

  if (row) {
    ({ risk_score: riskScore, vehicle_count: vehicleCount, pedestrian_count: pedestrianCount,
       speed_avg_mph: speedAvgMph, congestion_index: congestionIndex,
       active_cameras: activeCameras, total_cameras: totalCameras } = row);
  } else {
    const tel = computeZoneTelemetry(zone, now, weather);
    ({ riskScore, vehicleCount, pedestrianCount, speedAvgMph,
       congestionIndex, activeCameras, totalCameras } = tel);
  }

  // Add jitter so scores vary naturally between refreshes (~±6%)
  riskScore = clamp(addNoise(riskScore, 0.06), 0, 1);

  // Apply zone-specific overrides (persistent risk floors/ceilings, camera faults)
  const override = ZONE_OVERRIDES[zone.id];
  if (override) {
    riskScore = clamp(addNoise(riskScore, 0.03), override.riskFloor, override.riskCeiling);
    if (override.activeCameras !== undefined) activeCameras = override.activeCameras;
  }

  // Apply same overrides to forecast so Emerging Risks section reflects reality
  let forecast = computeForecast(zone, now, weather);
  if (override) {
    forecast = forecast.map(fp => ({
      ...fp,
      risk: Math.round(clamp(addNoise(fp.risk, 0.03), override.riskFloor, override.riskCeiling) * 1000) / 1000,
    }));
  }

  return {
    zone_id:          zone.id,
    name:             zone.name,
    risk_level:       riskLevel(riskScore),
    risk_score:       Math.round(riskScore * 1000) / 1000,
    speed_avg_mph:    speedAvgMph,
    pedestrian_count: pedestrianCount,
    vehicle_count:    vehicleCount,
    active_cameras:   activeCameras,
    total_cameras:    totalCameras,
    forecast_30m:     forecast,
    recommendations:  SYNTHETIC_RECOMMENDATIONS[zone.id] ?? [],
    events:           buildSyntheticEvents(zone.id, now),
    interventions:    [],
  };
}

/**
 * Lambda Function URL handler.
 * Returns a LiveState JSON matching the exact shape the Next.js app expects.
 *
 * Query params:
 *   ?city=springfield_il | khalifa_city_auh | mbz_city_auh  (default: springfield_il)
 *   ?weather=clear | rain | fog                             (default: clear)
 */
export const handler = async (event: {
  queryStringParameters?: Record<string, string>;
}): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> => {
  const cityId  = (event.queryStringParameters?.city    ?? "springfield_il") as string;
  const weather = (event.queryStringParameters?.weather ?? "clear") as WeatherCondition;
  const simHour = event.queryStringParameters?.sim_hour;

  // Allow callers to simulate a specific UTC hour for demo/off-hours cities
  let now = new Date();
  if (simHour !== undefined) {
    const h = parseInt(simHour, 10);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      now = new Date(now);
      now.setUTCHours(h, 30, 0, 0);
    }
  }

  let dbData = new Map<string, DynamoZoneRow>();
  try {
    dbData = await queryZoneState(cityId);
  } catch (err) {
    console.warn("DynamoDB query failed, using model fallback:", (err as Error).message);
  }

  const cityZones = ZONES.filter((z) => z.cityId === cityId);
  const zones     = cityZones.map((zone) => buildZoneState(zone, dbData.get(zone.id), now, weather));

  const riskScores   = zones.map((z) => z.risk_score);
  const avgRisk      = riskScores.reduce((a, b) => a + b, 0) / Math.max(1, riskScores.length);
  const activeAlerts = zones.filter((z) => z.risk_level === "HIGH").length;

  const liveState = {
    snapshot_id:          `live-${now.getTime()}`,
    timestamp:            now.toISOString(),
    district_risk:        riskLevel(avgRisk),
    active_alerts:        activeAlerts,
    avg_latency_ms:       36 + Math.floor(Math.random() * 20),
    camera_health_pct:    zones.some(z => z.active_cameras < z.total_cameras) ? 94 : 98,
    forecast_horizon_min: 30,
    zones,
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store" },
    body: JSON.stringify(liveState),
  };
};
