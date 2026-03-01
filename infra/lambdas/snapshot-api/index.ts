import {
  TimestreamQueryClient,
  QueryCommand,
  ColumnInfo,
  Row,
} from "@aws-sdk/client-timestream-query";
import { ZONES, ZoneDef } from "../generator/zones";
import { computeZoneTelemetry, computeForecast, WeatherCondition } from "../generator/model";

const tsQuery = new TimestreamQueryClient({});

const DB    = process.env.TIMESTREAM_DATABASE!;
const TABLE = process.env.TIMESTREAM_TABLE!;

// ── Types matching the Next.js app's LiveState contract ───────────────────────

type RiskLevel = "LOW" | "MED" | "HIGH";

function riskLevel(score: number): RiskLevel {
  if (score < 0.4) return "LOW";
  if (score < 0.7) return "MED";
  return "HIGH";
}

function parseRows(columns: ColumnInfo[], rows: Row[]): Record<string, string | null>[] {
  return rows.map((row) => {
    const obj: Record<string, string | null> = {};
    row.Data?.forEach((datum, i) => {
      obj[columns[i].Name ?? `col_${i}`] = datum.ScalarValue ?? null;
    });
    return obj;
  });
}

interface TimestreamRow {
  zone_id:          string;
  zone_name:        string;
  city_id:          string;
  risk_score:       string;
  vehicle_count:    string;
  pedestrian_count: string;
  speed_avg_mph:    string;
  congestion_index: string;
  active_cameras:   string;
  total_cameras:    string;
}

/**
 * Query Timestream for the latest telemetry reading per zone.
 * Falls back to empty if Timestream has no data yet (before first generator run).
 */
async function queryLatestTelemetry(cityId: string): Promise<Map<string, TimestreamRow>> {
  const sql = `
    SELECT zone_id, zone_name, city_id,
      MAX_BY(risk_score,       time) AS risk_score,
      MAX_BY(vehicle_count,    time) AS vehicle_count,
      MAX_BY(pedestrian_count, time) AS pedestrian_count,
      MAX_BY(speed_avg_mph,    time) AS speed_avg_mph,
      MAX_BY(congestion_index, time) AS congestion_index,
      MAX_BY(active_cameras,   time) AS active_cameras,
      MAX_BY(total_cameras,    time) AS total_cameras
    FROM "${DB}"."${TABLE}"
    WHERE time > ago(5m)
      AND measure_name = 'zone_telemetry'
      AND city_id = '${cityId}'
    GROUP BY zone_id, zone_name, city_id
  `;

  const result = await tsQuery.send(new QueryCommand({ QueryString: sql }));
  const rows = parseRows(result.ColumnInfo ?? [], result.Rows ?? []) as unknown as TimestreamRow[];
  return new Map(rows.map((r) => [r.zone_id, r]));
}

function buildZoneState(zone: ZoneDef, ts: TimestreamRow | undefined, now: Date, weather: WeatherCondition) {
  let riskScore: number;
  let vehicleCount: number;
  let pedestrianCount: number;
  let speedAvgMph: number;
  let congestionIndex: number;
  let activeCameras: number;
  let totalCameras: number;

  if (ts) {
    // Use live Timestream data
    riskScore       = parseFloat(ts.risk_score);
    vehicleCount    = parseInt(ts.vehicle_count,    10);
    pedestrianCount = parseInt(ts.pedestrian_count, 10);
    speedAvgMph     = parseFloat(ts.speed_avg_mph);
    congestionIndex = parseFloat(ts.congestion_index);
    activeCameras   = parseInt(ts.active_cameras,   10);
    totalCameras    = parseInt(ts.total_cameras,    10);
  } else {
    // No Timestream data yet — fall back to the model directly
    const tel   = computeZoneTelemetry(zone, now, weather);
    riskScore       = tel.riskScore;
    vehicleCount    = tel.vehicleCount;
    pedestrianCount = tel.pedestrianCount;
    speedAvgMph     = tel.speedAvgMph;
    congestionIndex = tel.congestionIndex;
    activeCameras   = tel.activeCameras;
    totalCameras    = tel.totalCameras;
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
    // These are populated by the app's intervention/mutation layer
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
 *   ?city=springfield_il | khalifa_city_auh | mbz_city_auh (default: springfield_il)
 *   ?weather=clear | rain | fog (default: clear)
 */
export const handler = async (event: {
  queryStringParameters?: Record<string, string>;
}): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  const cityId  = (event.queryStringParameters?.city    ?? "springfield_il") as string;
  const weather = (event.queryStringParameters?.weather ?? "clear") as WeatherCondition;
  const now     = new Date();

  // Fetch latest readings from Timestream; fall back to model if unavailable
  let tsData = new Map<string, TimestreamRow>();
  try {
    tsData = await queryLatestTelemetry(cityId);
  } catch (err) {
    console.warn("Timestream query failed, using model fallback:", (err as Error).message);
  }

  const cityZones = ZONES.filter((z) => z.cityId === cityId);
  const zones     = cityZones.map((zone) =>
    buildZoneState(zone, tsData.get(zone.id), now, weather)
  );

  // District aggregates
  const riskScores   = zones.map((z) => z.risk_score);
  const avgRisk      = riskScores.reduce((a, b) => a + b, 0) / Math.max(1, riskScores.length);
  const activeAlerts = zones.filter((z) => z.risk_level === "HIGH").length;

  const liveState = {
    snapshot_id:         `live-${now.getTime()}`,
    timestamp:           now.toISOString(),
    district_risk:       riskLevel(avgRisk),
    active_alerts:       activeAlerts,
    avg_latency_ms:      42,
    camera_health_pct:   98,
    forecast_horizon_min: 30,
    zones,
  };

  return {
    statusCode: 200,
    headers: {
      "Content-Type":  "application/json",
      "Cache-Control": "no-cache, no-store",
    },
    body: JSON.stringify(liveState),
  };
};
