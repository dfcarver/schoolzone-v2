import { NextRequest, NextResponse } from "next/server";
import { CITIES } from "@/lib/cityConfig";
import { RiskLevel } from "@/lib/types";
import type { MappedIncident } from "@/lib/mapFeatures";

// Cache results for 5 minutes
const cache = new Map<string, { data: MappedIncident[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60_000;

// TomTom icon category → app incident type
function categoryToType(cat: number): string {
  switch (cat) {
    case 1:  return "accident";
    case 6:  return "congestion";
    case 7:  return "lane_closure";
    case 8:  return "road_closure";
    case 9:  return "road_works";
    case 14: return "vehicle_breakdown";
    default: return "hazard";
  }
}

// TomTom icon category → human label
function categoryLabel(cat: number): string {
  switch (cat) {
    case 1:  return "Accident";
    case 2:  return "Fog";
    case 3:  return "Dangerous Conditions";
    case 4:  return "Rain";
    case 5:  return "Ice";
    case 6:  return "Traffic Jam";
    case 7:  return "Lane Closed";
    case 8:  return "Road Closed";
    case 9:  return "Road Works";
    case 10: return "High Wind";
    case 11: return "Flooding";
    case 14: return "Broken Down Vehicle";
    default: return "Incident";
  }
}

// TomTom magnitudeOfDelay (0–4) → RiskLevel
function delayToSeverity(mag: number): RiskLevel {
  if (mag >= 3) return RiskLevel.HIGH;
  if (mag >= 2) return RiskLevel.MED;
  return RiskLevel.LOW;
}

// Find the nearest corridor school to a given coordinate
function nearestZone(
  lat: number,
  lng: number,
  corridors: { school: { zone_id: string; name: string; lat: number; lng: number } }[]
): { zone_id: string; zone_name: string } {
  let best = corridors[0].school;
  let bestDist = Infinity;
  for (const c of corridors) {
    const dlat = c.school.lat - lat;
    const dlng = c.school.lng - lng;
    const d = dlat * dlat + dlng * dlng;
    if (d < bestDist) { bestDist = d; best = c.school; }
  }
  return { zone_id: best.zone_id, zone_name: best.name };
}

// Extract a [lng, lat] pair from TomTom geometry (Point or LineString midpoint)
function extractCoords(geometry: { type: string; coordinates: number[] | number[][] }): [number, number] | null {
  if (geometry.type === "Point") {
    const c = geometry.coordinates as number[];
    return [c[0], c[1]];
  }
  if (geometry.type === "LineString") {
    const coords = geometry.coordinates as number[][];
    const mid = coords[Math.floor(coords.length / 2)];
    return [mid[0], mid[1]];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("city") ?? "springfield_il";

  // TomTom incidents only wired up for Springfield for now
  if (cityId !== "springfield_il") {
    return NextResponse.json([]);
  }

  const cached = cache.get(cityId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const apiKey = process.env.TOMTOM_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json({ error: "TOMTOM_API_KEY not configured" }, { status: 503 });
  }

  const city = CITIES.find((c) => c.id === cityId)!;
  const { north, south, east, west } = city.bounds;

  // TomTom bbox = west,south,east,north
  const bbox = `${west},${south},${east},${north}`;
  const fields = [
    "incidentDetails/incidents/type",
    "incidentDetails/incidents/geometry/coordinates",
    "incidentDetails/incidents/geometry/type",
    "incidentDetails/incidents/properties/id",
    "incidentDetails/incidents/properties/iconCategory",
    "incidentDetails/incidents/properties/magnitudeOfDelay",
    "incidentDetails/incidents/properties/events/description",
    "incidentDetails/incidents/properties/startTime",
    "incidentDetails/incidents/properties/from",
    "incidentDetails/incidents/properties/to",
  ].join(",");

  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails` +
    `?bbox=${bbox}&fields={${fields}}&language=en-GB` +
    `&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14` +
    `&timeValidityFilter=present&key=${apiKey}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `TomTom API ${res.status}: ${text}` }, { status: 502 });
  }

  const json = await res.json();
  const raw: unknown[] = json.incidents ?? [];

  const mapped: MappedIncident[] = [];

  for (const item of raw) {
    const feature = item as {
      geometry: { type: string; coordinates: number[] | number[][] };
      properties: {
        id: string;
        iconCategory: number;
        magnitudeOfDelay: number;
        events?: { description: string }[];
        startTime?: string;
        from?: string;
        to?: string;
      };
    };

    const coords = extractCoords(feature.geometry);
    if (!coords) continue;

    const [lng, lat] = coords;
    const { zone_id, zone_name } = nearestZone(lat, lng, city.corridors);
    const cat = feature.properties.iconCategory ?? 0;
    const mag = feature.properties.magnitudeOfDelay ?? 0;
    const desc = feature.properties.events?.[0]?.description ?? categoryLabel(cat);
    const from = feature.properties.from ?? "";
    const to   = feature.properties.to   ?? "";

    mapped.push({
      incident_id: feature.properties.id ?? `tt-${Date.now()}-${Math.random()}`,
      zone_id,
      zone_name,
      severity: delayToSeverity(mag),
      type: categoryToType(cat),
      title: categoryLabel(cat),
      summary: [desc, from && to ? `${from} → ${to}` : from || to].filter(Boolean).join(" · "),
      reported_at: feature.properties.startTime ?? new Date().toISOString(),
      status: mag >= 3 ? "investigating" : "monitoring",
      events: [{
        event_id: `${feature.properties.id}-e0`,
        timestamp: feature.properties.startTime ?? new Date().toISOString(),
        type: categoryToType(cat),
        description: desc,
        payload: {},
      }],
      model_metadata: {
        model_name: "TomTom Traffic API",
        model_version: "5",
        prediction_confidence: 1.0,
        features_used: ["real-time traffic"],
        training_data_range: "live",
        inference_latency_ms: 0,
      },
      lat,
      lng,
    });
  }

  cache.set(cityId, { data: mapped, ts: Date.now() });
  return NextResponse.json(mapped);
}
