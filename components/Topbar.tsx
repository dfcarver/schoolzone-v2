"use client";

import { useState } from "react";
import { useDemoConfig, ScenarioId } from "@/lib/demoConfig";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMobileNav } from "@/components/AppShell";
import { useTheme } from "@/lib/ThemeProvider";
import { useNotifications } from "@/lib/notifications";
import { useLiveStateContext } from "@/lib/LiveStateProvider";
import NotificationPanel from "@/components/NotificationPanel";

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
  const { toggle } = useMobileNav();
  const { theme, toggle: toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const { sseStatus } = useLiveStateContext();
  const [showNotifs, setShowNotifs] = useState(false);
  const formattedTime = timestamp ? formatTime(timestamp) : "--:--:--";

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-6 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button onClick={toggle} className="lg:hidden p-1.5 -ml-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
        {snapshotId && (
          <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
            | Snapshot: {snapshotId}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <select
          value={config.scenario}
          onChange={(e) => updateConfig({ scenario: e.target.value as ScenarioId })}
          className="text-xs border border-gray-200 dark:border-gray-600 rounded-md px-2 py-1 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800"
        >
          {(Object.keys(SCENARIO_LABELS) as ScenarioId[]).map((s) => (
            <option key={s} value={s}>{SCENARIO_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={() => updateConfig({ timeMode: config.timeMode === "live" ? "paused" : "live" })}
          className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
            config.timeMode === "live"
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400"
              : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
          }`}
        >
          {config.timeMode === "live" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="hidden sm:inline">Live</span>
            </>
          ) : (
            <>
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-500" />
              <span className="hidden sm:inline">Paused</span>
            </>
          )}
        </button>
        <span className="hidden sm:inline text-xs font-mono text-gray-600 dark:text-gray-400">{formattedTime}</span>
        <span className={`hidden sm:flex items-center gap-1.5 text-xs ${
          sseStatus === "live" ? "text-emerald-600 dark:text-emerald-400" :
          sseStatus === "connecting" ? "text-amber-600 dark:text-amber-400" :
          "text-red-600 dark:text-red-400"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            sseStatus === "live" ? "bg-emerald-500" :
            sseStatus === "connecting" ? "bg-amber-400 animate-pulse" :
            "bg-red-500"
          }`} />
          {sseStatus === "live" ? "Synced" : sseStatus === "connecting" ? "Connecting…" : "Disconnected"}
        </span>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
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

        {session && (
          <div className="flex items-center gap-2 sm:gap-3 border-l border-gray-200 dark:border-gray-700 pl-2 sm:pl-4">
            <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400 capitalize">{session.username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs px-2 sm:px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
