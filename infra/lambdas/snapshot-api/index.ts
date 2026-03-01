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
    // Live data from DynamoDB (written by the generator every minute)
    ({ risk_score: riskScore, vehicle_count: vehicleCount, pedestrian_count: pedestrianCount,
       speed_avg_mph: speedAvgMph, congestion_index: congestionIndex,
       active_cameras: activeCameras, total_cameras: totalCameras } = row);
  } else {
    // No data yet — use the model directly as a fallback
    const tel = computeZoneTelemetry(zone, now, weather);
    ({ riskScore, vehicleCount, pedestrianCount, speedAvgMph,
       congestionIndex, activeCameras, totalCameras } = tel);
  }

  return {
    zone_id:          zone.id,
    name:             zone.name,
    risk_level:       riskLevel(riskScore),
    risk_score:       riskScore,
    speed_avg_mph:    speedAvgMph,
    pedestrian_count: pedestrianCount,
    vehicle_count:    vehicleCount,
    active_cameras:   activeCameras,
    total_cameras:    totalCameras,
    forecast_30m:     computeForecast(zone, now, weather),
    recommendations:  [],
    events:           [],
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
  const now     = new Date();

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
    avg_latency_ms:       42,
    camera_health_pct:    98,
    forecast_horizon_min: 30,
    zones,
  };

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store" },
    body: JSON.stringify(liveState),
  };
};
