"use client";

import { useState } from "react";
import { useDemoConfig, ScenarioId, WeatherMode } from "@/lib/demoConfig";
import { useNotifications } from "@/lib/notifications";
import { useLiveStateContext } from "@/lib/LiveStateProvider";
import NotificationPanel from "@/components/NotificationPanel";
import { CITIES } from "@/lib/cityConfig";

interface TopbarProps {
  snapshotId?: string;
  timestamp?: string;
  title?: string;
}

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  normal:    "Normal",
  surge:     "Surge",
  weather:   "Weather",
  dismissal: "Dismissal",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${h}:${m}:${s} UTC`;
}

export default function Topbar({ snapshotId, timestamp, title = "Operations Console" }: TopbarProps) {
  const { config, updateConfig } = useDemoConfig();
  const { unreadCount } = useNotifications();
  const { syncStatus } = useLiveStateContext();
  const [showNotifs, setShowNotifs] = useState(false);
  const formattedTime = timestamp ? formatTime(timestamp) : "--:--:--";
  const cityLabel = CITIES.find(c => c.id === config.selectedCity)?.label;

  return (
    <header className="h-12 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left: page title */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold text-slate-200 truncate">{title}</h1>
        {cityLabel && (
          <span className="hidden sm:inline text-xs text-slate-400 px-2 py-0.5 bg-slate-800 rounded-md shrink-0">{cityLabel}</span>
        )}
        {snapshotId && (
          <span className="hidden md:inline text-xs text-slate-600 font-mono">{snapshotId}</span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Data source toggle */}
        {process.env.NEXT_PUBLIC_AWS_SNAPSHOT_API_URL && (
          <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden text-xs">
            <button
              onClick={() => updateConfig({ dataMode: "live" })}
              className={`px-2.5 py-1 transition-colors ${config.dataMode === "live" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
            >
              AWS
            </button>
            <button
              onClick={() => updateConfig({ dataMode: "demo" })}
              className={`px-2.5 py-1 transition-colors border-l border-slate-700 ${config.dataMode === "demo" ? "bg-violet-600 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"}`}
            >
              Demo
            </button>
          </div>
        )}

        {/* Scenario selector */}
        {config.dataMode === "demo" && (
          <select
            value={config.scenario}
            onChange={(e) => updateConfig({ scenario: e.target.value as ScenarioId })}
            className="text-xs border border-slate-700 rounded-lg px-2 py-1 text-slate-300 bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {(Object.keys(SCENARIO_LABELS) as ScenarioId[]).map((s) => (
              <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>
            ))}
          </select>
        )}

        {/* Weather toggle — affects Lambda risk model */}
        {config.dataMode === "live" && (
          <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 hidden sm:inline">Weather:</span>
          <div className="flex items-center rounded-lg border border-slate-700 overflow-hidden text-xs">
            {(["clear", "rain", "fog"] as WeatherMode[]).map((w) => (
              <button
                key={w}
                onClick={() => updateConfig({ weather: w })}
                title={w.charAt(0).toUpperCase() + w.slice(1)}
                className={`px-2 py-1 transition-colors border-l border-slate-700 first:border-l-0 ${
                  config.weather === w ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                }`}
              >
                {w === "clear" ? "☀️" : w === "rain" ? "🌧️" : "🌫️"}
              </button>
            ))}
          </div>
          </div>
        )}

        {/* Live / Paused toggle */}
        <button
          onClick={() => updateConfig({ timeMode: config.timeMode === "live" ? "paused" : "live" })}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${
            config.timeMode === "live"
              ? "border-green-800 bg-green-950/50 text-green-400"
              : "border-amber-800 bg-amber-950/50 text-amber-400"
          }`}
        >
          {config.timeMode === "live" ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
              </span>
              <span className="hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <span className="inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
              <span className="hidden sm:inline">Paused</span>
            </>
          )}
        </button>

        {/* Timestamp */}
        <span className="hidden md:inline text-xs font-mono text-slate-600">{formattedTime}</span>

        {/* Sync status — show AWS Live when in live mode, Supabase status otherwise */}
        {config.dataMode === "live" ? (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="hidden md:inline">AWS Live</span>
          </span>
        ) : syncStatus !== "disconnected" && (
          <span className={`hidden sm:flex items-center gap-1.5 text-xs ${
            syncStatus === "live" ? "text-emerald-400" : "text-amber-400"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              syncStatus === "live" ? "bg-emerald-500" : "bg-amber-400 animate-pulse"
            }`} />
            <span className="hidden md:inline">
              {syncStatus === "live" ? "Synced" : "Connecting…"}
            </span>
          </span>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors relative"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
        </div>
      </div>
    </header>
  );
}
