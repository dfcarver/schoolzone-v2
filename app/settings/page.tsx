"use client";

import { useDemoConfig, ScenarioId } from "@/lib/demoConfig";
import { useToast } from "@/components/Toast";
import Topbar from "@/components/Topbar";

const SCENARIO_OPTIONS: { id: ScenarioId; label: string; description: string }[] = [
  { id: "normal", label: "Normal", description: "Typical school day — moderate risk, routine operations" },
  { id: "surge", label: "Surge", description: "Traffic surge event — elevated risk across multiple zones" },
  { id: "weather", label: "Weather", description: "Severe weather — reduced visibility, wet roads, camera outages" },
  { id: "dismissal", label: "Dismissal", description: "School dismissal — peak pedestrian activity and congestion" },
];

const INTERVAL_OPTIONS = [
  { value: 3000, label: "3s (Fast)" },
  { value: 5000, label: "5s (Normal)" },
  { value: 10000, label: "10s (Slow)" },
  { value: 15000, label: "15s (Very Slow)" },
];

export default function SettingsPage() {
  const { config, updateConfig } = useDemoConfig();
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 max-w-2xl">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Demo Settings</h1>

        {/* Scenario */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Scenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SCENARIO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  updateConfig({ scenario: opt.id });
                  toast(`Scenario changed to ${opt.label}`, "success");
                }}
                className={`text-left border rounded-lg p-4 transition-colors ${
                  config.scenario === opt.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <p className={`text-sm font-medium ${config.scenario === opt.id ? "text-blue-700 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Time Mode */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Time Mode</h2>
          <div className="flex gap-3">
            <button
              onClick={() => {
                updateConfig({ timeMode: "live" });
                toast("Switched to Live mode", "info");
              }}
              className={`flex-1 border rounded-lg p-4 transition-colors ${
                config.timeMode === "live"
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <p className={`text-sm font-medium ${config.timeMode === "live" ? "text-green-700 dark:text-green-400" : "text-gray-900 dark:text-gray-100"}`}>Live</p>
              <p className="text-xs text-gray-500 mt-1">Snapshots rotate automatically</p>
            </button>
            <button
              onClick={() => {
                updateConfig({ timeMode: "paused" });
                toast("Switched to Paused mode", "info");
              }}
              className={`flex-1 border rounded-lg p-4 transition-colors ${
                config.timeMode === "paused"
                  ? "border-amber-500 bg-amber-50 dark:bg-amber-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <p className={`text-sm font-medium ${config.timeMode === "paused" ? "text-amber-700 dark:text-amber-400" : "text-gray-900 dark:text-gray-100"}`}>Paused</p>
              <p className="text-xs text-gray-500 mt-1">Freeze on current snapshot</p>
            </button>
          </div>
        </section>

        {/* Snapshot Interval */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Snapshot Interval</h2>
          <select
            value={config.snapshotIntervalMs}
            onChange={(e) => updateConfig({ snapshotIntervalMs: Number(e.target.value) })}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 w-full max-w-xs"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">How often the live state rotates between snapshots</p>
        </section>

        {/* Toggles */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Features</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Demo Mutation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Allow in-memory intervention application</p>
              </div>
              <input
                type="checkbox"
                checked={config.demoMutationEnabled}
                onChange={(e) => updateConfig({ demoMutationEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Runtime Validation</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Validate each snapshot against schema on load</p>
              </div>
              <input
                type="checkbox"
                checked={config.runtimeValidationEnabled}
                onChange={(e) => updateConfig({ runtimeValidationEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
          </div>
        </section>

        {/* Info */}
        <section className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            All settings are persisted to localStorage and take effect immediately.
            Demo mutations are in-memory only and reset on page refresh.
          </p>
        </section>
      </div>
    </div>
  );
}
