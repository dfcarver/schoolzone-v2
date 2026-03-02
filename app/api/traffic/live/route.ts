import { NextRequest, NextResponse } from "next/server";
import { CITIES } from "@/lib/cityConfig";

const ROUTES_API = "https://routes.googleapis.com/directions/v2:computeRoutes";

// Cache results for 60 seconds to avoid hammering the API on every client poll
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60_000;

export async function GET(req: NextRequest) {
  const cityId = req.nextUrl.searchParams.get("city") ?? "springfield_il";

  // Use a server-only key if available, otherwise fall back to the public key
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_KEY ??
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
    "";

  if (!apiKey) {
    return NextResponse.json({ error: "Maps API key not configured" }, { status: 503 });
  }

  const city = CITIES.find((c) => c.id === cityId);
  if (!city) {
    return NextResponse.json({ error: "Unknown city" }, { status: 400 });
  }

  // Return cached result if fresh
  const cached = cache.get(cityId);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const departureTime = new Date().toISOString();

  const results = await Promise.allSettled(
    city.corridors.map(async (corridor) => {
      const origin = corridor.path[0];
      const destination = corridor.path[corridor.path.length - 1];

      const body = {
        origin: {
          location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
        },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        departureTime,
      };

      const res = await fetch(ROUTES_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.duration,routes.staticDuration",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Routes API ${res.status}: ${text}`);
      }

      const data = await res.json();
      const route = data.routes?.[0];
      if (!route) throw new Error("No route returned");

      // Durations come back as e.g. "123s"
      const durationSec = parseInt(route.duration?.replace("s", "") ?? "0", 10);
      const staticSec   = parseInt(route.staticDuration?.replace("s", "") ?? "0", 10);
      const delaySec    = Math.max(0, durationSec - staticSec);

      // congestion = fraction of travel time that is delay, clamped 0–1
      const congestion = staticSec > 0 ? Math.min(1, delaySec / staticSec) : 0;

      return { zone_id: corridor.school.zone_id, congestion, delay_seconds: delaySec };
    })
  );

  const zones = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { zone_id: city.corridors[i].school.zone_id, congestion: null, error: (r.reason as Error).message }
  );

  const payload = { city: cityId, zones, fetched_at: new Date().toISOString() };
  cache.set(cityId, { data: payload, ts: Date.now() });

  return NextResponse.json(payload);
}
