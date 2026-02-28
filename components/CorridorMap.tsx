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
import { Incident } from "@/lib/types";
import { useNotifications } from "@/lib/notifications";
import {
  useCongestionEngine,
  congestionLabel,
  congestionColor,
  formatTime,
  CorridorDef,
} from "@/lib/hooks/useCongestionEngine";
import { useGeofenceAlerts } from "@/lib/hooks/useGeofenceAlerts";
import MapToolbar, { MapFeatureFlags } from "./map/MapToolbar";
import IncidentOverlay from "./map/IncidentOverlay";
import GeofenceLayer from "./map/GeofenceLayer";
import WeatherPanel from "./map/WeatherPanel";
import WhatIfPanel from "./map/WhatIfPanel";
import ParentFlowPanel from "./map/ParentFlowPanel";
import InterventionDispatch from "./map/InterventionDispatch";
import CorridorMapFallback from "./map/CorridorMapFallback";
import QuickstartStrip, { QuickstartPreset } from "./map/QuickstartStrip";
import CorridorLabels from "./map/CorridorLabels";
import FeatureHint from "./map/FeatureHint";

// ---------------------------------------------------------------------------
// Corridor definitions
// ---------------------------------------------------------------------------

const CORRIDORS: CorridorDef[] = [
  {
    id: "zone-001",
    name: "Oak Avenue Corridor",
    path: [
      { lat: 39.7845, lng: -89.6501 }, // north — runs south along Oak Ave
      { lat: 39.7817, lng: -89.6501 }, // corner at school
      { lat: 39.7817, lng: -89.6461 }, // turns east along school frontage
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
      { lat: 39.7900, lng: -89.6492 }, // west — runs east along Maple Dr
      { lat: 39.7900, lng: -89.6440 }, // corner at school
      { lat: 39.7870, lng: -89.6440 }, // turns south along side street
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
      { lat: 39.7755, lng: -89.6635 }, // west — runs east along Elm St
      { lat: 39.7755, lng: -89.6580 }, // school
      { lat: 39.7755, lng: -89.6535 }, // continues east
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
      { lat: 39.7864, lng: -89.6390 }, // north — runs south along Pine Blvd
      { lat: 39.7832, lng: -89.6390 }, // corner at school
      { lat: 39.7832, lng: -89.6348 }, // turns east along cross street
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
      { lat: 39.7950, lng: -89.6572 }, // west — runs east along Cedar Ln
      { lat: 39.7950, lng: -89.6520 }, // corner at school
      { lat: 39.7918, lng: -89.6520 }, // turns south along side street
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

const BOUNDS_RESTRICTION: google.maps.LatLngBoundsLiteral = {
  north: OVERVIEW_CENTER.lat + 0.0217,
  south: OVERVIEW_CENTER.lat - 0.0217,
  east: OVERVIEW_CENTER.lng + 0.0283,
  west: OVERVIEW_CENTER.lng - 0.0283,
};

type MapViewType = "roadmap" | "satellite" | "hybrid" | "terrain" | "dark" | "minimal";

interface MapViewOption { label: string; value: MapViewType; icon: string; description: string }
const MAP_VIEW_OPTIONS: MapViewOption[] = [
  { label: "Map",       value: "roadmap",   icon: "🗺️",  description: "Standard road map"       },
  { label: "Satellite", value: "satellite", icon: "🛰️",  description: "Aerial imagery"           },
  { label: "Hybrid",    value: "hybrid",    icon: "📍",  description: "Satellite + road labels"  },
  { label: "Terrain",   value: "terrain",   icon: "⛰️",  description: "Topographic view"         },
  { label: "Dark",      value: "dark",      icon: "🌙",  description: "Night monitoring mode"    },
  { label: "Minimal",   value: "minimal",   icon: "⬜",  description: "Clean, no clutter"        },
];

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry",                                                  stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke",                                        stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill",                                          stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill",  stylers: [{ color: "#d59563" }] },
  { featureType: "road",                    elementType: "geometry",           stylers: [{ color: "#38414e" }] },
  { featureType: "road",                    elementType: "geometry.stroke",    stylers: [{ color: "#212a37" }] },
  { featureType: "road",                    elementType: "labels.text.fill",   stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway",            elementType: "geometry",           stylers: [{ color: "#746855" }] },
  { featureType: "road.highway",            elementType: "geometry.stroke",    stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway",            elementType: "labels.text.fill",   stylers: [{ color: "#f3d19c" }] },
  { featureType: "water",                   elementType: "geometry",           stylers: [{ color: "#17263c" }] },
  { featureType: "water",                   elementType: "labels.text.fill",   stylers: [{ color: "#515c6d" }] },
  { featureType: "water",                   elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const MINIMAL_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi",                      stylers: [{ visibility: "off" }]         },
  { featureType: "transit",                  stylers: [{ visibility: "off" }]         },
  { elementType: "labels.icon",              stylers: [{ visibility: "off" }]         },
  { featureType: "landscape",  elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "road",       elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road",       elementType: "geometry.stroke", stylers: [{ color: "#e8e8e8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water",      elementType: "geometry", stylers: [{ color: "#c9d6df" }] },
];

const MAP_TYPE_STYLES: Partial<Record<MapViewType, google.maps.MapTypeStyle[]>> = {
  dark: DARK_MAP_STYLES,
  minimal: MINIMAL_MAP_STYLES,
};

function getBaseTypeId(mapType: MapViewType): string {
  return mapType === "dark" || mapType === "minimal" ? "roadmap" : mapType;
}

function getMapOptions(mapType: MapViewType): google.maps.MapOptions {
  return {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    mapTypeId: getBaseTypeId(mapType),
    tilt: mapType === "satellite" || mapType === "hybrid" ? 45 : 0,
    styles: MAP_TYPE_STYLES[mapType] ?? [],
    minZoom: 14,
    maxZoom: 21,
    restriction: { latLngBounds: BOUNDS_RESTRICTION, strictBounds: true },
  };
}

// Parse ISO timestamp → minute-of-day (hours*60+minutes)
function toMinuteOfDay(iso: string): number {
  try {
    const d = new Date(iso);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  } catch {
    return -1;
  }
}

let dispatchCounter = 0;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CorridorMap() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const { push: pushNotification } = useNotifications();

  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<string>(CORRIDORS[0].id);
  const [mapViewType, setMapViewType] = useState<MapViewType>("hybrid");
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Derive a stable center object so the GoogleMap center prop only changes when the
  // selected school actually changes. Without this, a new {lat,lng} object is created
  // on every render and the library re-pans to the same hardcoded location every time.
  const mapCenter = useMemo(() => {
    if (!selectedSchool) return OVERVIEW_CENTER;
    const c = CORRIDORS.find((x) => x.id === selectedSchool);
    return c ? { lat: c.school.lat, lng: c.school.lng } : OVERVIEW_CENTER;
  }, [selectedSchool]);

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

  // Dismissal time overrides per school
  const [dismissalOverrides, setDismissalOverrides] = useState<Record<string, number>>({});
  const handleChangeDismissal = useCallback((schoolId: string, min: number) => {
    setDismissalOverrides((prev) => ({ ...prev, [schoolId]: min }));
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

  // Incidents — fetched from API instead of hardcoded
  const [incidents, setIncidents] = useState<Incident[]>([]);
  useEffect(() => {
    fetch("/api/incidents")
      .then((r) => r.json())
      .then((data: Incident[]) => setIncidents(data))
      .catch(() => {/* leave empty on error */});
  }, []);

  const mappedIncidents = useMemo<MappedIncident[]>(
    () => mapIncidentsToCoords(incidents),
    [incidents]
  );

  // Historical playback mode
  const [historicalMode, setHistoricalMode] = useState(false);

  const toggleHistoricalMode = useCallback(() => {
    setHistoricalMode((v) => {
      const next = !v;
      // Auto-enable incidents feature when turning on historical mode
      if (next) setFeatures((prev) => ({ ...prev, incidents: true }));
      return next;
    });
  }, []);

  // Track newly appearing incidents for highlight effect
  const prevVisibleIncidentIds = useRef<Set<string>>(new Set());
  const [newlyVisibleIds, setNewlyVisibleIds] = useState<Set<string>>(new Set());

  // Congestion engine (replaces inline state + effects)
  const engine = useCongestionEngine({
    corridors: CORRIDORS,
    weatherMultiplier,
    activeScenario,
  });
  const { timeMin, setTimeMin, isPlaying, setIsPlaying, congestionData, getCongestion } = engine;

  // Filter incidents in historical mode
  const visibleIncidents = useMemo(() => {
    if (!historicalMode) return mappedIncidents;
    return mappedIncidents.filter((inc) => toMinuteOfDay(inc.reported_at) <= timeMin);
  }, [historicalMode, mappedIncidents, timeMin]);

  // Detect newly appearing incidents for highlight animation
  useEffect(() => {
    if (!historicalMode) return;
    const currentIds = new Set(visibleIncidents.map((i) => i.incident_id));
    const appeared = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevVisibleIncidentIds.current.has(id)) appeared.add(id);
    });
    prevVisibleIncidentIds.current = currentIds;
    if (appeared.size > 0) {
      setNewlyVisibleIds(appeared);
      const timer = setTimeout(() => setNewlyVisibleIds(new Set()), 2000);
      return () => clearTimeout(timer);
    }
  }, [historicalMode, visibleIncidents]);

  // Geofence alerts (extracted hook with module-level deduplication)
  useGeofenceAlerts(
    congestionData.map((c) => ({ id: c.id, school: { name: c.school.name }, congestion: c.congestion })),
    geofences,
    features.geofences,
    pushNotification
  );

  // Map navigation lock — when true, school/polyline clicks won't pan or zoom the map
  const [navLocked, setNavLocked] = useState(false);

  const navigateToSchool = useCallback((schoolId: string) => {
    setSelectedSchool(schoolId);
    if (navLocked) return;
    const corridor = CORRIDORS.find((c) => c.id === schoolId);
    if (corridor && mapRef.current) {
      mapRef.current.panTo({ lat: corridor.school.lat, lng: corridor.school.lng });
    }
  }, [navLocked]);

  const navigateToOverview = useCallback(() => {
    setSelectedSchool("");
    if (navLocked) return;
    if (mapRef.current) {
      mapRef.current.panTo(OVERVIEW_CENTER);
      mapRef.current.setZoom(OVERVIEW_ZOOM);
    }
  }, [navLocked]);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);
  const onUnmount = useCallback(() => { mapRef.current = null; }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setMapTypeId(getBaseTypeId(mapViewType));
    mapRef.current.setTilt(mapViewType === "satellite" || mapViewType === "hybrid" ? 45 : 0);
    mapRef.current.setOptions({ styles: MAP_TYPE_STYLES[mapViewType] ?? [] });
  }, [mapViewType]);

  const dispatchCorridor = useMemo(() => {
    if (!dispatchTarget) return null;
    const c = congestionData.find((cd) => cd.id === dispatchTarget);
    if (!c) return null;
    return { id: c.id, name: c.name, congestion: c.congestion };
  }, [dispatchTarget, congestionData]);

  // Handler for loading a saved scenario (updates time + weather too)
  const handleLoadSaved = useCallback((
    scenarioId: WhatIfScenarioId,
    savedTime: number,
    savedWeather: WeatherCondition
  ) => {
    setActiveScenario(scenarioId);
    setTimeMin(savedTime);
    setWeather(savedWeather);
  }, [setTimeMin]);

  // Quickstart presets
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const handleQuickstart = useCallback((preset: QuickstartPreset) => {
    setTimeMin(preset.timeMin);
    setWeather(preset.weather);
    setIsPlaying(false);
    setFeatures((prev) => ({ ...prev, ...preset.features }));
    if (preset.scenario) setActiveScenario(preset.scenario);
    setActivePreset((prev) => (prev === preset.label ? null : preset.label));
  }, [setTimeMin, setIsPlaying]);

  // Active feature summary badges
  const summaryBadges = useMemo(() => {
    const badges: { label: string; color: string; onDismiss?: () => void }[] = [];
    if (weather !== "clear") {
      const p = WEATHER_PROFILES[weather];
      badges.push({
        label: `${p.icon} ${p.label} (+${Math.round((p.congestionMultiplier - 1) * 100)}%)`,
        color: "amber",
        onDismiss: () => setWeather("clear"),
      });
    }
    if (activeScenario) {
      const s = WHAT_IF_SCENARIOS.find((sc) => sc.id === activeScenario);
      if (s) badges.push({
        label: `Scenario: ${s.label}`,
        color: "emerald",
        onDismiss: () => setActiveScenario(null),
      });
    }
    if (features.incidents) {
      badges.push({
        label: `${visibleIncidents.length} incident${visibleIncidents.length !== 1 ? "s" : ""}`,
        color: visibleIncidents.length > 0 ? "red" : "gray",
        onDismiss: () => toggleFeature("incidents"),
      });
    }
    if (features.geofences) {
      badges.push({ label: "Geofences active", color: "blue", onDismiss: () => toggleFeature("geofences") });
    }
    if (historicalMode) {
      badges.push({ label: "Historical mode", color: "purple", onDismiss: toggleHistoricalMode });
    }
    if (features.parentFlow) {
      badges.push({ label: "Parent queues", color: "cyan", onDismiss: () => toggleFeature("parentFlow") });
    }
    return badges;
  }, [weather, activeScenario, features, visibleIncidents, historicalMode, toggleFeature, toggleHistoricalMode]);

  // ---------------------------------------------------------------------------
  // Fallback states
  // ---------------------------------------------------------------------------

  const fallbackProps = {
    corridors: CORRIDORS,
    engine,
    weather,
    setWeather,
    activeScenario,
    features,
    onToggleFeature: toggleFeature,
    selectedSchool,
    onSelectSchool: navigateToSchool,
    onOverview: navigateToOverview,
  };

  if (!apiKey) {
    return <CorridorMapFallback {...fallbackProps} reason="no-api-key" />;
  }
  if (loadError) {
    return <CorridorMapFallback {...fallbackProps} reason="load-error" />;
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

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

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

      {/* Quickstart strip */}
      <QuickstartStrip onApply={handleQuickstart} activePreset={activePreset} />

      {/* Active feature summary bar */}
      {summaryBadges.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {summaryBadges.map((b) => {
            const colorMap: Record<string, string> = {
              amber: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300",
              emerald: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300",
              red: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300",
              blue: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300",
              purple: "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300",
              cyan: "bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300",
              gray: "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400",
            };
            return (
              <span key={b.label} className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${colorMap[b.color] ?? colorMap.gray}`}>
                {b.label}
                {b.onDismiss && (
                  <button onClick={b.onDismiss} className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
                )}
              </span>
            );
          })}
        </div>
      )}

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
        <div className="flex items-center gap-2">
          {/* Map style picker */}
          <div className="relative">
            <button
              onClick={() => setShowMapPicker((v) => !v)}
              className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border transition-colors ${
                showMapPicker
                  ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span>{MAP_VIEW_OPTIONS.find((o) => o.value === mapViewType)?.icon}</span>
              <span className="font-medium">{MAP_VIEW_OPTIONS.find((o) => o.value === mapViewType)?.label}</span>
              <svg className={`w-3 h-3 transition-transform ${showMapPicker ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMapPicker && (
              <>
                {/* backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setShowMapPicker(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2 w-56">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-2 px-1">Map Style</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {MAP_VIEW_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setMapViewType(opt.value); setShowMapPicker(false); }}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border text-center transition-colors ${
                          mapViewType === opt.value
                            ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700"
                            : "bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="text-base">{opt.icon}</span>
                        <span className={`text-[10px] font-medium leading-tight ${mapViewType === opt.value ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"}`}>
                          {opt.label}
                        </span>
                        <span className="text-[8px] text-gray-400 dark:text-gray-500 leading-tight">{opt.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation lock */}
          <button
            onClick={() => setNavLocked((v) => !v)}
            title={navLocked ? "Unlock map navigation — clicks will pan and zoom" : "Lock map position — clicks won't move the map"}
            className={`flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-md border transition-colors ${
              navLocked
                ? "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-semibold"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            {navLocked ? (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1C9.24 1 7 3.24 7 6v1H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-1V6c0-2.76-2.24-5-5-5zm0 2c1.66 0 3 1.34 3 3v1H9V6c0-1.66 1.34-3 3-3zm0 10c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z"/>
              </svg>
            )}
            {navLocked ? "Locked" : "Lock"}
          </button>
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
          {/* Historical mode toggle */}
          <button
            onClick={toggleHistoricalMode}
            title="Historical mode — incidents appear at their reported time during playback"
            className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-colors shrink-0 ${
              historicalMode
                ? "bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-semibold"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            Historical
          </button>
        </div>
        {historicalMode && (
          <p className="text-[10px] text-purple-500 dark:text-purple-400">
            Historical mode — incidents appear at their reported time
          </p>
        )}
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
          center={mapCenter}
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

          {/* Corridor polylines — click opens InfoWindow (#6) */}
          {congestionData.map((c) => (
            <Polyline key={c.id} path={c.path}
              options={{
                strokeColor: congestionColor(c.congestion),
                strokeOpacity: 0.9,
                strokeWeight: 4 + c.congestion * 8,
                clickable: true,
              }}
              onClick={() => {
                navigateToSchool(c.id);
                setActiveInfo(c.id);
                if (features.interventions) setDispatchTarget(c.id);
              }}
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

          {/* Incident overlay — filtered in historical mode */}
          <IncidentOverlay incidents={visibleIncidents} visible={features.incidents} />

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

          {/* Corridor name + congestion % labels */}
          <CorridorLabels corridors={congestionData} visible={selectedSchool !== ""} />
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
              } ${newlyVisibleIds.has(c.id) ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
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
        {/* Inline hints for map-only features (no panel below) */}
        {features.incidents && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Incidents
              <span className="ml-2 text-[10px] font-normal text-gray-400">{visibleIncidents.length} visible</span>
            </h4>
            <FeatureHint>
              Colored pins appear on the map above — red = HIGH severity, orange = MED, blue = LOW. Click any pin to open its event timeline and AI model confidence score.
            </FeatureHint>
            {historicalMode && (
              <p className="text-[10px] text-purple-500 dark:text-purple-400">
                Historical mode is on — incidents appear progressively as the time slider advances past their reported time.
              </p>
            )}
            {visibleIncidents.length === 0 && !historicalMode && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">No incidents loaded yet.</p>
            )}
          </div>
        )}

        {features.geofences && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">Geofences</h4>
            <FeatureHint>
              Blue circles appear around each school on the map. They turn red when congestion exceeds the alert threshold. Click any circle directly on the map to edit its radius, threshold, and speed limit.
            </FeatureHint>
            <div className="space-y-1.5 text-[10px]">
              {congestionData.map((c) => {
                const gf = geofences.find((g) => g.zoneId === c.id && g.enabled);
                if (!gf) return null;
                const breached = c.congestion > gf.congestionThreshold;
                return (
                  <div key={c.id} className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300 truncate">{c.school.name}</span>
                    <span className={`font-medium shrink-0 ml-2 ${breached ? "text-red-600" : "text-gray-400"}`}>
                      {breached ? "⚠ Breached" : `${Math.round(c.congestion * 100)}% / ${Math.round(gf.congestionThreshold * 100)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {features.weather && (
          <WeatherPanel weather={weather} onChangeWeather={setWeather} />
        )}

        {features.whatIf && (
          <WhatIfPanel
            corridors={congestionData.map((c) => ({ id: c.id, schoolName: c.school.name, baseCongestion: c.congestion }))}
            getCongestion={getCongestion}
            currentTimeMin={timeMin}
            weather={weather}
            onApplyScenario={setActiveScenario}
            activeScenario={activeScenario}
            onLoadSaved={handleLoadSaved}
          />
        )}

        {features.parentFlow && (
          <ParentFlowPanel
            schools={CORRIDORS.map((c) => ({ id: c.id, name: c.school.name, type: c.school.type, enrollment: c.school.enrollment }))}
            timeMin={timeMin}
            dismissalOverrides={dismissalOverrides}
            onChangeDismissal={handleChangeDismissal}
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
