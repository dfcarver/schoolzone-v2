"use client";

import { useDemoConfig, ScenarioId } from "@/lib/demoConfig";
import { useAuth } from "@/lib/auth/AuthProvider";

interface TopbarProps {
  snapshotId?: string;
  timestamp?: string;
  title?: string;
}

const SCENARIO_LABELS: Record<ScenarioId, string> = {
  normal: "Normal",
  surge: "Surge",
  weather: "Weather",
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
  const { session, logout } = useAuth();
  const formattedTime = timestamp ? formatTime(timestamp) : "--:--:--";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        {snapshotId && (
          <>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-500">
              Snapshot: {snapshotId}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <select
          value={config.scenario}
          onChange={(e) => updateConfig({ scenario: e.target.value as ScenarioId })}
          className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white"
        >
          {(Object.keys(SCENARIO_LABELS) as ScenarioId[]).map((s) => (
            <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={() => updateConfig({ timeMode: config.timeMode === "live" ? "paused" : "live" })}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
            config.timeMode === "live"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {config.timeMode === "live" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              Live
            </>
          ) : (
            <>
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" />
              Paused
            </>
          )}
        </button>
        <span className="text-xs font-mono text-gray-600">{formattedTime}</span>
        {session && (
          <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
            <span className="text-xs text-gray-500 capitalize">{session.username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
