"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Polyline,
  Marker,
  Circle,
  InfoWindow,
  TrafficLayer,
  TransitLayer,
} from "@react-google-maps/api";
import {
  WeatherCondition,
  WEATHER_PROFILES,
  DEFAULT_GEOFENCES,
  GeofenceConfig,
  MappedIncident,
  mapIncidentsToCoords,
  DispatchedIntervention,
  DispatchStatus,
  WhatIfScenarioId,
  WHAT_IF_SCENARIOS,
} from "@/lib/mapFeatures";
import { Incident, RiskLevel } from "@/lib/types";
import { useNotifications } from "@/lib/notifications";
import MapToolbar, { MapFeatureFlags } from "./map/MapToolbar";
import IncidentOverlay from "./map/IncidentOverlay";
import GeofenceLayer from "./map/GeofenceLayer";
import WeatherPanel from "./map/WeatherPanel";
import WhatIfPanel from "./map/WhatIfPanel";
import ParentFlowPanel from "./map/ParentFlowPanel";
import InterventionDispatch from "./map/InterventionDispatch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CongestionPeak {
  centerMin: number;
  spread: number;
  intensity: number;
}

interface CorridorDef {
  id: string;
  name: string;
  path: google.maps.LatLngLiteral[];
  school: {
    zone_id: string;
    name: string;
    lat: number;
    lng: number;
    type: string;
    enrollment: number;
  };
  peaks: CongestionPeak[];
  baselineCongestion: number;
}

// ---------------------------------------------------------------------------
// Congestion engine
// ---------------------------------------------------------------------------

function gaussianBell(x: number, center: number, spread: number): number {
  const d = (x - center) / spread;
  return Math.exp(-0.5 * d * d);
}

function getCongestionForCorridor(corridor: CorridorDef, minuteOfDay: number, weatherMultiplier: number, scenario: WhatIfScenarioId | null): number {
  const scenarioConfig = scenario ? WHAT_IF_SCENARIOS.find((s) => s.id === scenario) : null;

  let level = corridor.baselineCongestion;
  for (const peak of corridor.peaks) {
    const adjustedCenter = peak.centerMin + (scenarioConfig?.dismissalShiftMin ?? 0);
    const adjustedSpread = peak.spread + (scenarioConfig?.peakSpreadIncrease ?? 0);
    level += peak.intensity * gaussianBell(minuteOfDay, adjustedCenter, adjustedSpread);
  }

  level = level * weatherMultiplier;

  if (scenarioConfig) {
    level = level * (1 - scenarioConfig.congestionReduction);
  }

  return Math.min(level, 1);
}

function congestionLabel(value: number): string {
  if (value >= 0.75) return "Severe";
  if (value >= 0.5) return "Heavy";
  if (value >= 0.3) return "Moderate";
  return "Light";
}

function congestionColor(value: number): string {
  if (value >= 0.75) return "#dc2626";
  if (value >= 0.5) return "#f59e0b";
  if (value >= 0.3) return "#facc15";
  return "#22c55e";
}

function formatTime(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60);
  const m = minuteOfDay % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

// ---------------------------------------------------------------------------
// Corridor definitions
// ---------------------------------------------------------------------------

const CORRIDORS: CorridorDef[] = [
  {
    id: "zone-001",
    name: "Oak Avenue Corridor",
    path: [
      { lat: 39.7808, lng: -89.6501 },
      { lat: 39.7812, lng: -89.6501 },
      { lat: 39.7817, lng: -89.6500 },
      { lat: 39.7822, lng: -89.6501 },
      { lat: 39.7826, lng: -89.6502 },
    ],
    school: { zone_id: "zone-001", name: "Lincoln Elementary", lat: 39.7817, lng: -89.6501, type: "elementary", enrollment: 485 },
    baselineCongestion: 0.08,
    peaks: [
      { centerMin: 7 * 60 + 45, spread: 20, intensity: 0.82 },
      { centerMin: 15 * 60, spread: 20, intensity: 0.88 },
    ],
  },
  {
    id: "zone-002",
    name: "Maple Drive Corridor",
    path: [
      { lat: 39.7900, lng: -89.6460 },
      { lat: 39.7900, lng: -89.6452 },
      { lat: 39.7899, lng: -89.6443 },
      { lat: 39.7900, lng: -89.6435 },
      { lat: 39.7901, lng: -89.6425 },
    ],
    school: { zone_id: "zone-002", name: "Washington Middle School", lat: 39.7900, lng: -89.6440, type: "middle", enrollment: 720 },
    baselineCongestion: 0.10,
    peaks: [
      { centerMin: 7 * 60 + 30, spread: 22, intensity: 0.70 },
      { centerMin: 15 * 60 + 15, spread: 22, intensity: 0.78 },
      { centerMin: 16 * 60 + 30, spread: 30, intensity: 0.35 },
    ],
  },
  {
    id: "zone-003",
    name: "Elm Street Corridor",
    path: [
      { lat: 39.7755, lng: -89.6598 },
      { lat: 39.7755, lng: -89.6592 },
      { lat: 39.7756, lng: -89.6584 },
      { lat: 39.7755, lng: -89.6576 },
      { lat: 39.7754, lng: -89.6567 },
    ],
    school: { zone_id: "zone-003", name: "Jefferson High School", lat: 39.7755, lng: -89.6580, type: "high", enrollment: 1100 },
    baselineCongestion: 0.12,
    peaks: [
      { centerMin: 7 * 60 + 15, spread: 25, intensity: 0.75 },
      { centerMin: 15 * 60 + 30, spread: 25, intensity: 0.85 },
      { centerMin: 17 * 60, spread: 35, intensity: 0.40 },
    ],
  },
  {
    id: "zone-004",
    name: "Pine Boulevard Corridor",
    path: [
      { lat: 39.7842, lng: -89.6390 },
      { lat: 39.7838, lng: -89.6390 },
      { lat: 39.7834, lng: -89.6391 },
      { lat: 39.7829, lng: -89.6390 },
      { lat: 39.7824, lng: -89.6389 },
    ],
    school: { zone_id: "zone-004", name: "Roosevelt Academy", lat: 39.7832, lng: -89.6390, type: "elementary", enrollment: 320 },
    baselineCongestion: 0.06,
    peaks: [
      { centerMin: 7 * 60 + 50, spread: 18, intensity: 0.65 },
      { centerMin: 14 * 60 + 50, spread: 18, intensity: 0.72 },
    ],
  },
  {
    id: "zone-005",
    name: "Cedar Lane Corridor",
    path: [
      { lat: 39.7958, lng: -89.6521 },
      { lat: 39.7955, lng: -89.6521 },
      { lat: 39.7951, lng: -89.6519 },
      { lat: 39.7947, lng: -89.6520 },
      { lat: 39.7943, lng: -89.6521 },
    ],
    school: { zone_id: "zone-005", name: "Adams Preparatory", lat: 39.7950, lng: -89.6520, type: "middle", enrollment: 610 },
    baselineCongestion: 0.09,
    peaks: [
      { centerMin: 7 * 60 + 25, spread: 22, intensity: 0.72 },
      { centerMin: 15 * 60 + 10, spread: 22, intensity: 0.80 },
      { centerMin: 16 * 60 + 45, spread: 30, intensity: 0.30 },
    ],
  },
];

const TIME_PRESETS = [
  { label: "Early AM", min: 6 * 60 },
  { label: "Drop-off", min: 7 * 60 + 45 },
  { label: "Midday", min: 12 * 60 },
  { label: "Dismissal", min: 15 * 60 + 15 },
  { label: "After-school", min: 16 * 60 + 45 },
  { label: "Evening", min: 19 * 60 },
];

const MAP_CONTAINER_STYLE: React.CSSProperties = { width: "100%", height: "100%", borderRadius: "0.5rem" };
const DEFAULT_ZOOM = 19;
const OVERVIEW_ZOOM = 15;
const OVERVIEW_CENTER = { lat: 39.7860, lng: -89.6480 };

// 3 × 3 mile bounding box (1.5 mi ≈ 0.0217° lat, ≈ 0.0283° lng at this latitude)
const BOUNDS_RESTRICTION: google.maps.LatLngBoundsLiteral = {
  north: OVERVIEW_CENTER.lat + 0.0217,
  south: OVERVIEW_CENTER.lat - 0.0217,
  east: OVERVIEW_CENTER.lng + 0.0283,
  west: OVERVIEW_CENTER.lng - 0.0283,
};

type MapViewType = "roadmap" | "satellite" | "hybrid";
const MAP_VIEW_OPTIONS: { label: string; value: MapViewType }[] = [
  { label: "Map", value: "roadmap" },
  { label: "Satellite", value: "satellite" },
  { label: "Hybrid", value: "hybrid" },
];

function getMapOptions(mapType: MapViewType): google.maps.MapOptions {
  return {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    mapTypeId: mapType,
    tilt: mapType !== "roadmap" ? 45 : 0,
    minZoom: 14,
    maxZoom: 21,
    restriction: {
      latLngBounds: BOUNDS_RESTRICTION,
      strictBounds: true,
    },
  };
}

// Mock incidents (loaded once)
const MOCK_INCIDENTS: Incident[] = [
  {
    incident_id: "INC-2025-0041", zone_id: "zone-003", zone_name: "Jefferson High School",
    severity: RiskLevel.HIGH, type: "near_miss",
    title: "Near-Miss: Pedestrian-Vehicle Conflict at Elm & 34th",
    summary: "Vehicle traveling 35mph failed to yield to pedestrians in crosswalk during dismissal.",
    reported_at: "2025-02-18T14:30:00Z", status: "investigating" as const,
    events: [
      { event_id: "evt-001", timestamp: "2025-02-18T14:20:00Z", type: "detection", description: "Pedestrian surge — 45 students at crosswalk", payload: { pedestrian_count: 45 } },
      { event_id: "evt-003", timestamp: "2025-02-18T14:28:00Z", type: "alert", description: "Speed violation — vehicle at 35mph in 20mph zone", payload: { speed_mph: 35 } },
      { event_id: "evt-004", timestamp: "2025-02-18T14:30:00Z", type: "incident", description: "Near-miss — vehicle failed to yield at crosswalk", payload: { distance_ft: 4.2 } },
      { event_id: "evt-005", timestamp: "2025-02-18T14:31:00Z", type: "response", description: "Traffic officer dispatched to Elm & 34th", payload: { eta_min: 4 } },
    ],
    model_metadata: { model_name: "SchoolZone-Risk-v3.2", model_version: "3.2.1", prediction_confidence: 0.87, features_used: ["speed_avg", "pedestrian_count"], training_data_range: "2023–2025", inference_latency_ms: 23 },
  },
  {
    incident_id: "INC-2025-0040", zone_id: "zone-002", zone_name: "Washington Middle School",
    severity: RiskLevel.MED, type: "speed_violation",
    title: "Repeated Speed Violations on Maple Dr",
    summary: "Multiple vehicles exceeded 20mph school zone limit on Maple Dr.",
    reported_at: "2025-02-18T14:15:00Z", status: "monitoring" as const,
    events: [
      { event_id: "evt-010", timestamp: "2025-02-18T14:00:00Z", type: "detection", description: "Speed monitoring initiated for dismissal window", payload: { zone_speed_limit: 20 } },
      { event_id: "evt-011", timestamp: "2025-02-18T14:10:00Z", type: "alert", description: "5 vehicles above 25mph in 10-min window", payload: { violation_count: 5 } },
      { event_id: "evt-012", timestamp: "2025-02-18T14:12:00Z", type: "intervention", description: "Dynamic speed sign activated", payload: { device_id: "SIGN-201" } },
    ],
    model_metadata: { model_name: "SchoolZone-Risk-v3.2", model_version: "3.2.1", prediction_confidence: 0.82, features_used: ["speed_avg", "vehicle_count"], training_data_range: "2023–2025", inference_latency_ms: 19 },
  },
  {
    incident_id: "INC-2025-0039", zone_id: "zone-003", zone_name: "Jefferson High School",
    severity: RiskLevel.HIGH, type: "congestion",
    title: "Critical Congestion During Dismissal at Jefferson HS",
    summary: "Severe gridlock on Elm St northbound during afternoon dismissal.",
    reported_at: "2025-02-17T15:05:00Z", status: "resolved" as const,
    events: [
      { event_id: "evt-020", timestamp: "2025-02-17T14:50:00Z", type: "detection", description: "Traffic flow dropped below 5mph on Elm St", payload: { avg_speed_mph: 4.2 } },
      { event_id: "evt-022", timestamp: "2025-02-17T15:00:00Z", type: "intervention", description: "Officer redirected traffic to alternate route", payload: { alternate_route: "Pine Blvd" } },
      { event_id: "evt-023", timestamp: "2025-02-17T15:15:00Z", type: "resolution", description: "Traffic flow restored to normal", payload: { avg_speed_mph: 18.5 } },
    ],
    model_metadata: { model_name: "SchoolZone-Risk-v3.2", model_version: "3.2.0", prediction_confidence: 0.79, features_used: ["traffic_flow", "vehicle_count"], training_data_range: "2023–2025", inference_latency_ms: 21 },
  },
  {
    incident_id: "INC-2025-0038", zone_id: "zone-005", zone_name: "Adams Preparatory",
    severity: RiskLevel.LOW, type: "equipment_failure",
    title: "Camera CAM-506 Intermittent Connection",
    summary: "Camera CAM-506 on Cedar Ln experienced intermittent connectivity.",
    reported_at: "2025-02-18T13:45:00Z", status: "monitoring" as const,
    events: [
      { event_id: "evt-030", timestamp: "2025-02-18T13:30:00Z", type: "detection", description: "Camera CAM-506 heartbeat missed", payload: { camera_id: "CAM-506" } },
      { event_id: "evt-031", timestamp: "2025-02-18T13:35:00Z", type: "alert", description: "Camera offline — switching to backup", payload: { coverage_pct: 65 } },
    ],
    model_metadata: { model_name: "SchoolZone-Risk-v3.2", model_version: "3.2.1", prediction_confidence: 0.91, features_used: ["camera_health"], training_data_range: "2023–2025", inference_latency_ms: 12 },
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

let dispatchCounter = 0;

export default function CorridorMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const { push: pushNotification } = useNotifications();

  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [timeMin, setTimeMin] = useState(7 * 60 + 45);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // School-level navigation
  const [selectedSchool, setSelectedSchool] = useState<string>(CORRIDORS[0].id);
  const [mapViewType, setMapViewType] = useState<MapViewType>("hybrid");

  const navigateToSchool = useCallback((schoolId: string) => {
    setSelectedSchool(schoolId);
    const corridor = CORRIDORS.find((c) => c.id === schoolId);
    if (corridor && mapRef.current) {
      mapRef.current.panTo({ lat: corridor.school.lat, lng: corridor.school.lng });
      mapRef.current.setZoom(DEFAULT_ZOOM);
    }
  }, []);

  const navigateToOverview = useCallback(() => {
    setSelectedSchool("");
    if (mapRef.current) {
      mapRef.current.panTo(OVERVIEW_CENTER);
      mapRef.current.setZoom(OVERVIEW_ZOOM);
    }
  }, []);

  // Feature flags
  const [features, setFeatures] = useState<MapFeatureFlags>({
    incidents: false, geofences: false, weather: false,
    whatIf: false, parentFlow: false, interventions: false, traffic: true,
  });
  const toggleFeature = useCallback((key: keyof MapFeatureFlags) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Weather
  const [weather, setWeather] = useState<WeatherCondition>("clear");
  const weatherMultiplier = WEATHER_PROFILES[weather].congestionMultiplier;

  // What-if
  const [activeScenario, setActiveScenario] = useState<WhatIfScenarioId | null>(null);

  // Geofences
  const [geofences, setGeofences] = useState<GeofenceConfig[]>(DEFAULT_GEOFENCES);
  const updateGeofence = useCallback((zoneId: string, updates: Partial<GeofenceConfig>) => {
    setGeofences((prev) => prev.map((g) => (g.zoneId === zoneId ? { ...g, ...updates } : g)));
  }, []);

  // Interventions
  const [dispatched, setDispatched] = useState<DispatchedIntervention[]>([]);
  const [dispatchTarget, setDispatchTarget] = useState<string | null>(null);

  const handleDispatch = useCallback((corridorId: string, corridorName: string, type: DispatchedIntervention["type"], description: string) => {
    const id = `dispatch-${++dispatchCounter}`;
    setDispatched((prev) => [
      { id, corridorId, corridorName, type, status: "dispatched", dispatchedAt: Date.now(), description },
      ...prev,
    ]);
    pushNotification({
      title: "Intervention Dispatched",
      body: `${description} deployed to ${corridorName}`,
      severity: "info",
      zone: corridorId,
      source: "dispatch",
    });
  }, [pushNotification]);

  const handleUpdateStatus = useCallback((id: string, status: DispatchStatus) => {
    setDispatched((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));
  }, []);

  // Incidents
  const mappedIncidents = useMemo<MappedIncident[]>(() => mapIncidentsToCoords(MOCK_INCIDENTS), []);

  // Congestion computation with weather + scenario
  const getCongestion = useCallback((corridorId: string, time: number) => {
    const corridor = CORRIDORS.find((c) => c.id === corridorId);
    if (!corridor) return 0;
    return getCongestionForCorridor(corridor, time, weatherMultiplier, activeScenario);
  }, [weatherMultiplier, activeScenario]);

  const congestionData = useMemo(() => {
    return CORRIDORS.map((c) => ({
      ...c,
      congestion: getCongestionForCorridor(c, timeMin, weatherMultiplier, activeScenario),
    }));
  }, [timeMin, weatherMultiplier, activeScenario]);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const onUnmount = useCallback(() => { mapRef.current = null; }, []);

  // Initial zoom to first school
  useEffect(() => {
    if (!mapRef.current) return;
    const first = CORRIDORS[0];
    mapRef.current.panTo({ lat: first.school.lat, lng: first.school.lng });
    mapRef.current.setZoom(DEFAULT_ZOOM);
  }, [isLoaded]);

  // Update map type when changed
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(mapViewType);
    mapRef.current.setTilt(mapViewType !== "roadmap" ? 45 : 0);
  }, [mapViewType]);

  // Playback
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setTimeMin((prev) => (prev >= 20 * 60 ? 6 * 60 : prev + 5));
      }, 150);
    } else if (playRef.current) {
      clearInterval(playRef.current);
      playRef.current = null;
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [isPlaying]);

  // Geofence alerts
  const prevBreaches = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!features.geofences) return;
    const currentBreaches = new Set<string>();
    congestionData.forEach((c) => {
      const gf = geofences.find((g) => g.zoneId === c.id && g.enabled);
      if (gf && c.congestion > gf.congestionThreshold) {
        currentBreaches.add(c.id);
        if (!prevBreaches.current.has(c.id)) {
          pushNotification({
            title: `Geofence Alert: ${c.school.name}`,
            body: `Congestion (${Math.round(c.congestion * 100)}%) exceeded ${Math.round(gf.congestionThreshold * 100)}% threshold`,
            severity: "critical",
            zone: c.id,
            source: "geofence",
          });
        }
      }
    });
    prevBreaches.current = currentBreaches;
  }, [congestionData, geofences, features.geofences, pushNotification]);

  // Corridor for dispatch
  const dispatchCorridor = useMemo(() => {
    if (!dispatchTarget) return null;
    const c = congestionData.find((cd) => cd.id === dispatchTarget);
    if (!c) return null;
    return { id: c.id, name: c.name, congestion: c.congestion };
  }, [dispatchTarget, congestionData]);

  // ---------- Fallback states ----------

  if (!apiKey) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Corridor Traffic Map</h3>
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center max-w-md">
            Google Maps API key required. Add{" "}
            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
            to your <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">.env.local</code> file.
          </p>
        </div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Corridor Traffic Map</h3>
        <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-950 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load Google Maps. Check your API key.</p>
        </div>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Corridor Traffic Map</h3>
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg animate-pulse">
          <p className="text-sm text-gray-400">Loading map…</p>
        </div>
      </div>
    );
  }

  // ---------- Main render ----------

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Corridor Traffic Map</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Springfield, IL — {weather !== "clear" ? `${WEATHER_PROFILES[weather].icon} ${WEATHER_PROFILES[weather].label} · ` : ""}
              {activeScenario ? `Scenario: ${WHAT_IF_SCENARIOS.find((s) => s.id === activeScenario)?.label} · ` : ""}
              Select a time of day to view school-zone congestion
            </p>
          </div>
        </div>
        <MapToolbar features={features} onToggle={toggleFeature} />
      </div>

      {/* School selector + Map view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={navigateToOverview}
            className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-colors ${
              selectedSchool === ""
                ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >All Schools</button>
          {CORRIDORS.map((c) => {
            const cd = congestionData.find((d) => d.id === c.id);
            return (
              <button key={c.id}
                onClick={() => navigateToSchool(c.id)}
                className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
                  selectedSchool === c.id
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                    : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cd ? congestionColor(cd.congestion) : "#22c55e" }} />
                {c.school.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          {MAP_VIEW_OPTIONS.map((opt) => (
            <button key={opt.value}
              onClick={() => setMapViewType(opt.value)}
              className={`text-[10px] px-2.5 py-1 rounded transition-colors ${
                mapViewType === opt.value
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-semibold shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Time controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
            title={isPlaying ? "Pause" : "Play through day"}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
            )}
          </button>
          <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 w-[80px] text-center">{formatTime(timeMin)}</span>
          <input type="range" min={6 * 60} max={20 * 60} step={5} value={timeMin}
            onChange={(e) => { setTimeMin(Number(e.target.value)); setIsPlaying(false); }}
            className="flex-1 h-2 accent-emerald-600 cursor-pointer"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((p) => (
            <button key={p.label}
              onClick={() => { setTimeMin(p.min); setIsPlaying(false); }}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                Math.abs(timeMin - p.min) < 10
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE}
          center={CORRIDORS[0] ? { lat: CORRIDORS[0].school.lat, lng: CORRIDORS[0].school.lng } : OVERVIEW_CENTER}
          zoom={DEFAULT_ZOOM}
          onLoad={onLoad} onUnmount={onUnmount} options={getMapOptions(mapViewType)}>

          {features.traffic && <TrafficLayer />}
          <TransitLayer />

          {/* Congestion radius circles */}
          {congestionData.map((c) => (
            <Circle key={`circle-${c.id}`}
              center={{ lat: c.school.lat, lng: c.school.lng }}
              radius={80 + c.congestion * 120}
              options={{
                fillColor: congestionColor(c.congestion),
                fillOpacity: 0.15 + c.congestion * 0.2,
                strokeColor: congestionColor(c.congestion),
                strokeOpacity: 0.4, strokeWeight: 1,
              }}
            />
          ))}

          {/* Corridor polylines */}
          {congestionData.map((c) => (
            <Polyline key={c.id} path={c.path}
              options={{
                strokeColor: congestionColor(c.congestion),
                strokeOpacity: 0.9,
                strokeWeight: 4 + c.congestion * 8,
                clickable: true,
              }}
              onClick={() => { navigateToSchool(c.id); if (features.interventions) setDispatchTarget(c.id); }}
            />
          ))}

          {/* School markers */}
          {congestionData.map((c) => (
            <Marker key={`marker-${c.id}`}
              position={{ lat: c.school.lat, lng: c.school.lng }}
              title={c.school.name}
              onClick={() => {
                navigateToSchool(c.id);
                setActiveInfo(c.id);
                if (features.interventions) setDispatchTarget(c.id);
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE, scale: 10,
                fillColor: congestionColor(c.congestion), fillOpacity: 1,
                strokeColor: "#ffffff", strokeWeight: 2,
              }}
            />
          ))}

          {/* Info windows */}
          {congestionData.map((c) =>
            activeInfo === c.id && (
              <InfoWindow key={`info-${c.id}`}
                position={{ lat: c.school.lat, lng: c.school.lng }}
                onCloseClick={() => setActiveInfo(null)}>
                <div className="p-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-gray-900">{c.school.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 capitalize">{c.school.type} school — {c.school.enrollment} students</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: congestionColor(c.congestion) }} />
                    <span className="text-xs font-medium" style={{ color: congestionColor(c.congestion) }}>
                      {congestionLabel(c.congestion)} ({Math.round(c.congestion * 100)}%)
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">at {formatTime(timeMin)}</p>
                  {weather !== "clear" && (
                    <p className="text-[10px] text-amber-500 mt-1">{WEATHER_PROFILES[weather].icon} {WEATHER_PROFILES[weather].visibilityNote}</p>
                  )}
                </div>
              </InfoWindow>
            )
          )}

          {/* Incident overlay */}
          <IncidentOverlay incidents={mappedIncidents} visible={features.incidents} />

          {/* Geofence layer */}
          <GeofenceLayer
            corridors={congestionData.map((c) => ({
              id: c.id, schoolName: c.school.name, lat: c.school.lat, lng: c.school.lng,
              congestion: c.congestion, speedAvg: 20 - c.congestion * 15,
            }))}
            geofences={geofences}
            onUpdateGeofence={updateGeofence}
            visible={features.geofences}
          />
        </GoogleMap>
      </div>

      {/* Congestion legend + corridor cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-4 text-[10px] text-gray-500 dark:text-gray-400">
          <span className="font-medium text-gray-600 dark:text-gray-300">Congestion:</span>
          {[
            { label: "Light", color: "#22c55e" },
            { label: "Moderate", color: "#facc15" },
            { label: "Heavy", color: "#f59e0b" },
            { label: "Severe", color: "#dc2626" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {congestionData.map((c) => (
            <button key={`card-${c.id}`}
              onClick={() => { navigateToSchool(c.id); if (features.interventions) setDispatchTarget(c.id); }}
              className={`border rounded-lg px-3 py-2 flex items-center gap-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                selectedSchool === c.id
                  ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/50"
                  : "border-gray-100 dark:border-gray-700"
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: congestionColor(c.congestion) }} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100 truncate">{c.school.name}</p>
                <p className="text-[10px]" style={{ color: congestionColor(c.congestion) }}>
                  {congestionLabel(c.congestion)} — {Math.round(c.congestion * 100)}%
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {features.weather && (
          <WeatherPanel weather={weather} onChangeWeather={setWeather} />
        )}

        {features.whatIf && (
          <WhatIfPanel
            corridors={congestionData.map((c) => ({ id: c.id, schoolName: c.school.name, baseCongestion: c.congestion }))}
            getCongestion={getCongestion}
            currentTimeMin={timeMin}
            onApplyScenario={setActiveScenario}
            activeScenario={activeScenario}
          />
        )}

        {features.parentFlow && (
          <ParentFlowPanel
            schools={CORRIDORS.map((c) => ({ id: c.id, name: c.school.name, type: c.school.type, enrollment: c.school.enrollment }))}
            timeMin={timeMin}
          />
        )}

        {features.interventions && (
          <InterventionDispatch
            interventions={dispatched}
            selectedCorridor={dispatchCorridor}
            onDispatch={handleDispatch}
            onUpdateStatus={handleUpdateStatus}
            onDismiss={() => setDispatchTarget(null)}
          />
        )}
      </div>
    </div>
  );
}
