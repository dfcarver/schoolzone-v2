"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// snapshot-api/index.ts
var snapshot_api_exports = {};
__export(snapshot_api_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(snapshot_api_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");

// generator/zones.ts
var ZONES = [
  // ── Springfield, IL ────────────────────────────────────────────────────────
  {
    id: "zone-001",
    name: "Lincoln Elementary",
    cityId: "springfield_il",
    type: "elementary",
    enrollment: 420,
    cameras: 4,
    lat: 39.7817,
    lng: -89.6501
  },
  {
    id: "zone-002",
    name: "Roosevelt Middle School",
    cityId: "springfield_il",
    type: "middle",
    enrollment: 610,
    cameras: 5,
    lat: 39.79,
    lng: -89.644
  },
  {
    id: "zone-003",
    name: "Jefferson High School",
    cityId: "springfield_il",
    type: "high",
    enrollment: 1050,
    cameras: 8,
    lat: 39.7755,
    lng: -89.658
  },
  {
    id: "zone-004",
    name: "Washington Elementary",
    cityId: "springfield_il",
    type: "elementary",
    enrollment: 385,
    cameras: 3,
    lat: 39.7832,
    lng: -89.639
  },
  {
    id: "zone-005",
    name: "Adams Middle School",
    cityId: "springfield_il",
    type: "middle",
    enrollment: 540,
    cameras: 5,
    lat: 39.795,
    lng: -89.652
  },
  // ── Khalifa City, Abu Dhabi ────────────────────────────────────────────────
  {
    id: "khalifa-001",
    name: "Yasmina British Academy",
    cityId: "khalifa_city_auh",
    type: "high",
    enrollment: 1200,
    cameras: 8,
    lat: 24.4158592,
    lng: 54.5471628
  },
  {
    id: "khalifa-002",
    name: "ADNOC Schools Khalifa City",
    cityId: "khalifa_city_auh",
    type: "elementary",
    enrollment: 650,
    cameras: 5,
    lat: 24.416729,
    lng: 54.514899
  },
  {
    id: "khalifa-003",
    name: "Int'l School of Choueifat",
    cityId: "khalifa_city_auh",
    type: "middle",
    enrollment: 820,
    cameras: 6,
    lat: 24.41446,
    lng: 54.56633
  },
  // ── MBZ City, Abu Dhabi ────────────────────────────────────────────────────
  {
    id: "mbz-001",
    name: "Aldar Academies MBZ",
    cityId: "mbz_city_auh",
    type: "high",
    enrollment: 1100,
    cameras: 7,
    lat: 24.37056,
    lng: 54.563863
  },
  {
    id: "mbz-002",
    name: "Abu Dhabi Int'l School MBZ",
    cityId: "mbz_city_auh",
    type: "elementary",
    enrollment: 540,
    cameras: 4,
    lat: 24.346302,
    lng: 54.541512
  },
  {
    id: "mbz-003",
    name: "Emirates National School MBZ",
    cityId: "mbz_city_auh",
    type: "middle",
    enrollment: 780,
    cameras: 6,
    lat: 24.360989,
    lng: 54.550989
  }
];

// generator/model.ts
var WEATHER_MULTIPLIERS = {
  clear: { congestion: 1, speed: 0 },
  rain: { congestion: 1.35, speed: 5 },
  fog: { congestion: 1.25, speed: 8 }
};
var DISMISSAL_MIN = {
  elementary: 15 * 60,
  // 3:00 PM
  middle: 15 * 60 + 15,
  // 3:15 PM
  high: 15 * 60 + 30
  // 3:30 PM
};
var DROPOFF_MIN = 7 * 60 + 45;
function bell(x, center, sigma) {
  return Math.exp(-0.5 * ((x - center) / sigma) ** 2);
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function noise(scale) {
  return (Math.random() - 0.5) * scale;
}
function computeZoneTelemetry(zone, now, weather = "clear") {
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const wm = WEATHER_MULTIPLIERS[weather];
  const dismissalMin = DISMISSAL_MIN[zone.type];
  const maxParents = zone.enrollment * 0.65;
  const dismissalPeak = maxParents * bell(minuteOfDay, dismissalMin, 15);
  const morningPeak = maxParents * 0.75 * bell(minuteOfDay, DROPOFF_MIN, 12);
  const baseTraffic = zone.enrollment * 0.03;
  const rawVehicles = (dismissalPeak + morningPeak + baseTraffic + noise(maxParents * 0.04)) * wm.congestion;
  const vehicleCount = Math.max(0, Math.round(rawVehicles));
  const congestionIndex = clamp(vehicleCount / maxParents, 0, 1);
  const speedAvgMph = Math.max(
    5,
    Math.round(25 - congestionIndex * 15 - wm.speed + noise(2))
  );
  const pedestrianCount = Math.max(
    0,
    Math.round(zone.enrollment * 0.35 * bell(minuteOfDay, dismissalMin, 10) + noise(5))
  );
  const pedestrianFactor = pedestrianCount / Math.max(1, zone.enrollment * 0.35);
  const riskScore = clamp(
    congestionIndex * 0.5 + (1 - speedAvgMph / 25) * 0.3 + pedestrianFactor * 0.2,
    0,
    1
  );
  return {
    riskScore: Math.round(riskScore * 1e3) / 1e3,
    vehicleCount,
    pedestrianCount,
    speedAvgMph,
    congestionIndex: Math.round(congestionIndex * 1e3) / 1e3,
    activeCameras: zone.cameras,
    totalCameras: zone.cameras
  };
}
function computeForecast(zone, now, weather = "clear") {
  return Array.from({ length: 6 }, (_, i) => {
    const futureTime = new Date(now.getTime() + (i + 1) * 5 * 6e4);
    const tel = computeZoneTelemetry(zone, futureTime, weather);
    return {
      time: futureTime.toISOString(),
      risk: tel.riskScore,
      confidence: Math.max(0.55, 1 - (i + 1) * 0.06)
      // confidence decays with horizon
    };
  });
}

// snapshot-api/index.ts
var ddb = new import_client_dynamodb.DynamoDBClient({});
var TABLE = process.env.DYNAMODB_TABLE;
function riskLevel(score) {
  if (score < 0.4)
    return "LOW";
  if (score < 0.7)
    return "MED";
  return "HIGH";
}
var ZONE_OVERRIDES = {
  "khalifa-002": { riskFloor: 0.72, riskCeiling: 0.81 },
  // persistently high-risk school
  "khalifa-003": { riskFloor: 0.35, riskCeiling: 0.65, activeCameras: 5 },
  // one camera offline
  "mbz-001": { riskFloor: 0.3, riskCeiling: 0.58 }
};
var SYNTHETIC_EVENTS = {
  "khalifa-002": [
    { offsetMin: 22, type: "alert", detail: "Speed violation: 47 km/h recorded in 20 km/h school zone" },
    { offsetMin: 14, type: "vehicle", detail: "Vehicle blocking school gate \u2014 dismissal lane congested" },
    { offsetMin: 8, type: "alert", detail: "Pedestrian density HIGH: 190+ students in active crossing zone" },
    { offsetMin: 3, type: "vehicle", detail: "Queue extending onto Khalifa St \u2014 28 vehicles waiting" }
  ],
  "khalifa-001": [
    { offsetMin: 31, type: "camera", detail: "Camera 6 feed restored after 4-min signal outage" },
    { offsetMin: 19, type: "vehicle", detail: "Drop-off queue extending onto service road" },
    { offsetMin: 6, type: "alert", detail: "Unaccompanied minor detected at north gate \u2014 security notified" }
  ],
  "khalifa-003": [
    { offsetMin: 45, type: "camera", detail: "Camera 4 offline \u2014 maintenance request raised (ticket #1847)" },
    { offsetMin: 17, type: "alert", detail: "Unplanned road closure: Al Reem Blvd intersection, rerouting active" },
    { offsetMin: 9, type: "vehicle", detail: "Bus convoy running 11 min late \u2014 3 buses affected" }
  ],
  "mbz-001": [
    { offsetMin: 28, type: "vehicle", detail: "School bus convoy delay: 4 buses running 8 min behind schedule" },
    { offsetMin: 11, type: "alert", detail: "Pedestrian signal malfunction at east entrance \u2014 manual control active" }
  ],
  "mbz-002": [
    { offsetMin: 36, type: "camera", detail: "Camera 2 repositioned \u2014 field of view expanded to cover new gate" },
    { offsetMin: 12, type: "vehicle", detail: "Elevated vehicle count: 94 vehicles in 10-min window" }
  ],
  "mbz-003": [
    { offsetMin: 24, type: "alert", detail: "Weather advisory: reduced visibility, speed enforcement active" },
    { offsetMin: 7, type: "vehicle", detail: "Parent double-parking incident \u2014 crossing guard deployed" }
  ]
};
var SYNTHETIC_RECOMMENDATIONS = {
  "khalifa-002": [
    { action: "Deploy crossing guard to school gate", impact: "Reduce pedestrian-vehicle conflicts ~40%", confidence: 0.91, priority: "HIGH" },
    { action: "Activate dynamic speed signs on Khalifa St", impact: "Expected 25% speed reduction in zone", confidence: 0.85, priority: "HIGH" },
    { action: "Send parent notification: staggered pick-up", impact: "Reduce peak congestion window by 15 min", confidence: 0.78, priority: "MED" }
  ],
  "khalifa-001": [
    { action: "Extend drop-off lane capacity by 30m", impact: "Absorb 40% more vehicles per cycle", confidence: 0.83, priority: "MED" },
    { action: "Activate variable message sign: use side gate", impact: "Reduce main gate load by 35%", confidence: 0.8, priority: "MED" }
  ],
  "khalifa-003": [
    { action: "Request police patrol for Al Reem closure", impact: "Restore normal flow within 20 min", confidence: 0.88, priority: "HIGH" },
    { action: "Dispatch maintenance to repair Camera 4", impact: "Restore full surveillance coverage", confidence: 0.95, priority: "MED" }
  ],
  "mbz-001": [
    { action: "Notify bus operator: prioritise Zone 1 routes", impact: "Reduce dismissal congestion by ~20 min", confidence: 0.76, priority: "MED" },
    { action: "Repair pedestrian signal at east entrance", impact: "Eliminate manual control requirement", confidence: 0.97, priority: "HIGH" }
  ],
  "mbz-003": [
    { action: "Deploy crossing guard: double-parking zone", impact: "Clear obstruction within 5 min", confidence: 0.89, priority: "MED" }
  ]
};
function buildSyntheticEvents(zoneId, now) {
  const events = SYNTHETIC_EVENTS[zoneId];
  if (!events)
    return [];
  return events.map(({ offsetMin, type, detail }) => {
    const t = new Date(now.getTime() - offsetMin * 6e4);
    const hh = String(t.getUTCHours()).padStart(2, "0");
    const mm = String(t.getUTCMinutes()).padStart(2, "0");
    const ss = String(t.getUTCSeconds()).padStart(2, "0");
    return { time: `${hh}:${mm}:${ss}`, type, detail };
  });
}
function addNoise(value, scale) {
  return value + (Math.random() - 0.5) * scale;
}
function clamp2(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
async function queryZoneState(cityId) {
  const result = await ddb.send(new import_client_dynamodb.QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "city_id = :city",
    ExpressionAttributeValues: { ":city": { S: cityId } }
  }));
  const map = /* @__PURE__ */ new Map();
  for (const item of result.Items ?? []) {
    const zoneId = item.zone_id?.S;
    if (!zoneId)
      continue;
    map.set(zoneId, {
      zone_id: zoneId,
      zone_name: item.zone_name?.S ?? "",
      risk_score: parseFloat(item.risk_score?.N ?? "0"),
      vehicle_count: parseInt(item.vehicle_count?.N ?? "0", 10),
      pedestrian_count: parseInt(item.pedestrian_count?.N ?? "0", 10),
      speed_avg_mph: parseFloat(item.speed_avg_mph?.N ?? "20"),
      congestion_index: parseFloat(item.congestion_index?.N ?? "0"),
      active_cameras: parseInt(item.active_cameras?.N ?? "0", 10),
      total_cameras: parseInt(item.total_cameras?.N ?? "0", 10)
    });
  }
  return map;
}
function buildZoneState(zone, row, now, weather) {
  let riskScore, vehicleCount, pedestrianCount;
  let speedAvgMph, congestionIndex, activeCameras, totalCameras;
  if (row) {
    ({
      risk_score: riskScore,
      vehicle_count: vehicleCount,
      pedestrian_count: pedestrianCount,
      speed_avg_mph: speedAvgMph,
      congestion_index: congestionIndex,
      active_cameras: activeCameras,
      total_cameras: totalCameras
    } = row);
  } else {
    const tel = computeZoneTelemetry(zone, now, weather);
    ({
      riskScore,
      vehicleCount,
      pedestrianCount,
      speedAvgMph,
      congestionIndex,
      activeCameras,
      totalCameras
    } = tel);
  }
  riskScore = clamp2(addNoise(riskScore, 0.06), 0, 1);
  const override = ZONE_OVERRIDES[zone.id];
  if (override) {
    riskScore = clamp2(addNoise(riskScore, 0.03), override.riskFloor, override.riskCeiling);
    if (override.activeCameras !== void 0)
      activeCameras = override.activeCameras;
  }
  let forecast = computeForecast(zone, now, weather);
  if (override) {
    forecast = forecast.map((fp) => ({
      ...fp,
      risk: Math.round(clamp2(addNoise(fp.risk, 0.03), override.riskFloor, override.riskCeiling) * 1e3) / 1e3
    }));
  }
  return {
    zone_id: zone.id,
    name: zone.name,
    risk_level: riskLevel(riskScore),
    risk_score: Math.round(riskScore * 1e3) / 1e3,
    speed_avg_mph: speedAvgMph,
    pedestrian_count: pedestrianCount,
    vehicle_count: vehicleCount,
    active_cameras: activeCameras,
    total_cameras: totalCameras,
    forecast_30m: forecast,
    recommendations: SYNTHETIC_RECOMMENDATIONS[zone.id] ?? [],
    events: buildSyntheticEvents(zone.id, now),
    interventions: []
  };
}
var handler = async (event) => {
  const cityId = event.queryStringParameters?.city ?? "springfield_il";
  const weather = event.queryStringParameters?.weather ?? "clear";
  const simHour = event.queryStringParameters?.sim_hour;
  let now = /* @__PURE__ */ new Date();
  if (simHour !== void 0) {
    const h = parseInt(simHour, 10);
    if (!isNaN(h) && h >= 0 && h <= 23) {
      now = new Date(now);
      now.setUTCHours(h, 30, 0, 0);
    }
  }
  let dbData = /* @__PURE__ */ new Map();
  try {
    dbData = await queryZoneState(cityId);
  } catch (err) {
    console.warn("DynamoDB query failed, using model fallback:", err.message);
  }
  const cityZones = ZONES.filter((z) => z.cityId === cityId);
  const zones = cityZones.map((zone) => buildZoneState(zone, dbData.get(zone.id), now, weather));
  const riskScores = zones.map((z) => z.risk_score);
  const avgRisk = riskScores.reduce((a, b) => a + b, 0) / Math.max(1, riskScores.length);
  const activeAlerts = zones.filter((z) => z.risk_level === "HIGH").length;
  const liveState = {
    snapshot_id: `live-${now.getTime()}`,
    timestamp: now.toISOString(),
    district_risk: riskLevel(avgRisk),
    active_alerts: activeAlerts,
    avg_latency_ms: 36 + Math.floor(Math.random() * 20),
    camera_health_pct: zones.some((z) => z.active_cameras < z.total_cameras) ? 94 : 98,
    forecast_horizon_min: 30,
    zones
  };
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store" },
    body: JSON.stringify(liveState)
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
