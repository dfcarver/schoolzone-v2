"use client";

import { useMemo } from "react";
import {
  WeatherCondition,
  WEATHER_PROFILES,
  GeofenceConfig,
  DEFAULT_GEOFENCES,
  WhatIfScenarioId,
  WHAT_IF_SCENARIOS,
} from "@/lib/mapFeatures";
import {
  CorridorDef,
  CongestionEntry,
  congestionColor,
  congestionLabel,
  formatTime,
  UseCongestionEngineResult,
} from "@/lib/hooks/useCongestionEngine";
import MapToolbar, { MapFeatureFlags } from "@/components/map/MapToolbar";

// ---------------------------------------------------------------------------
// SVG layout — map geo coords → SVG viewport (500 × 360)
// ---------------------------------------------------------------------------

const SVG_W = 500;
const SVG_H = 360;
const LAT_MIN = 39.7740;
const LAT_MAX = 39.7970;
const LNG_MIN = -89.6610;
const LNG_MAX = -89.6375;

function toSVG(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * SVG_W;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * SVG_H;
  return { x, y };
}

// Pre-compute school SVG positions from corridor definitions
function schoolPos(corridor: CorridorDef) {
  return toSVG(corridor.school.lat, corridor.school.lng);
}

// ---------------------------------------------------------------------------
// Time presets (same as CorridorMap)
// ---------------------------------------------------------------------------

const TIME_PRESETS = [
  { label: "Early AM", min: 6 * 60 },
  { label: "Drop-off", min: 7 * 60 + 45 },
  { label: "Midday", min: 12 * 60 },
  { label: "Dismissal", min: 15 * 60 + 15 },
  { label: "After-school", min: 16 * 60 + 45 },
  { label: "Evening", min: 19 * 60 },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CorridorMapFallbackProps {
  reason: "no-api-key" | "load-error";
  corridors: CorridorDef[];
  engine: UseCongestionEngineResult;
  weather: WeatherCondition;
  setWeather: (w: WeatherCondition) => void;
  activeScenario: WhatIfScenarioId | null;
  features: MapFeatureFlags;
  onToggleFeature: (key: keyof MapFeatureFlags) => void;
  selectedSchool: string;
  onSelectSchool: (id: string) => void;
  onOverview: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CorridorMapFallback({
  reason,
  corridors,
  engine,
  weather,
  features,
  onToggleFeature,
  selectedSchool,
  onSelectSchool,
  onOverview,
}: CorridorMapFallbackProps) {
  const { timeMin, setTimeMin, isPlaying, setIsPlaying, congestionData } = engine;

  // Build midpoint of each corridor path for the SVG line
  const corridorLines = useMemo(() => {
    return corridors.map((c) => {
      const pts = c.path.map((p) => toSVG(p.lat, p.lng));
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
      const entry = congestionData.find((cd) => cd.id === c.id);
      return { id: c.id, d, color: congestionColor(entry?.congestion ?? 0), congestion: entry?.congestion ?? 0 };
    });
  }, [corridors, congestionData]);

  const schoolNodes = useMemo(() => {
    return corridors.map((c) => {
      const pos = schoolPos(c);
      const entry = congestionData.find((cd) => cd.id === c.id);
      return { id: c.id, name: c.school.name, ...pos, color: congestionColor(entry?.congestion ?? 0), congestion: entry?.congestion ?? 0 };
    });
  }, [corridors, congestionData]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Corridor Traffic Map</h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              Springfield, IL — {weather !== "clear" ? `${WEATHER_PROFILES[weather].icon} ${WEATHER_PROFILES[weather].label} · ` : ""}
              Select a time of day to view school-zone congestion
            </p>
          </div>
        </div>
        <MapToolbar features={features} onToggle={onToggleFeature} />
      </div>

      {/* School selector */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={onOverview}
          className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-colors ${
            selectedSchool === ""
              ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >All Schools</button>
        {congestionData.map((c) => (
          <button key={c.id}
            onClick={() => onSelectSchool(c.id)}
            className={`text-[10px] px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-1.5 ${
              selectedSchool === c.id
                ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: congestionColor(c.congestion) }} />
            {c.school.name}
          </button>
        ))}
      </div>

      {/* Time controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying((v) => !v)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
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

      {/* SVG map diagram */}
      <div className="relative rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {/* Notice banner */}
        <div className="absolute top-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-3 py-1 text-[10px] text-amber-700 dark:text-amber-300 shadow-sm">
            {reason === "no-api-key"
              ? <>Map preview — add <code className="font-mono bg-amber-100 dark:bg-amber-900 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for full interactive map</>
              : "Map unavailable — failed to load Google Maps. Check your API key."}
          </div>
        </div>

        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" style={{ height: 360 }}>
          {/* Background grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-gray-200 dark:text-gray-700" />
            </pattern>
          </defs>
          <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

          {/* Corridor paths */}
          {corridorLines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              fill="none"
              stroke={line.color}
              strokeWidth={4 + line.congestion * 8}
              strokeOpacity={0.85}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* School nodes */}
          {schoolNodes.map((node) => {
            const isSelected = selectedSchool === node.id;
            return (
              <g key={node.id} className="cursor-pointer" onClick={() => onSelectSchool(node.id)}>
                {/* Selection ring */}
                {isSelected && (
                  <circle cx={node.x} cy={node.y} r={18} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 2" />
                )}
                {/* Congestion halo */}
                <circle cx={node.x} cy={node.y} r={14} fill={node.color} fillOpacity={0.15} />
                {/* Main dot */}
                <circle cx={node.x} cy={node.y} r={8} fill={node.color} stroke="white" strokeWidth={2} />
                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={isSelected ? "700" : "500"}
                  fill="currentColor"
                  className="text-gray-700 dark:text-gray-200"
                >
                  {node.name.split(" ").slice(0, 2).join(" ")}
                </text>
                {/* Congestion % */}
                <text x={node.x} y={node.y + 31} textAnchor="middle" fontSize={8} fill={node.color} fontWeight="600">
                  {Math.round(node.congestion * 100)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + corridor cards */}
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
              onClick={() => onSelectSchool(c.id)}
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
    </div>
  );
}
