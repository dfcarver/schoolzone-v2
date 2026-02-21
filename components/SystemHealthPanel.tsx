"use client";

import { LiveState } from "@/lib/types";
import { getMetrics } from "@/lib/metrics";

interface SystemHealthPanelProps {
  liveState: LiveState;
}

export default function SystemHealthPanel({ liveState }: SystemHealthPanelProps) {
  const metrics = getMetrics();

  const cameraHealthy = liveState.camera_health_pct >= 95;
  const latencyOk = liveState.avg_latency_ms <= 150;
  const fetchOk = metrics.fetchErrorCount === 0;

  const items = [
    {
      label: "Camera Network",
      value: `${liveState.camera_health_pct}%`,
      ok: cameraHealthy,
      detail: cameraHealthy ? "All cameras healthy" : "Degraded camera coverage",
    },
    {
      label: "Inference Latency",
      value: `${liveState.avg_latency_ms}ms`,
      ok: latencyOk,
      detail: latencyOk ? "Within threshold" : "Above 150ms threshold",
    },
    {
      label: "Data Pipeline",
      value: fetchOk ? "OK" : `${metrics.fetchErrorCount} errors`,
      ok: fetchOk,
      detail: `${metrics.fetchCount} fetches, ${metrics.snapshotRotations} rotations`,
    },
    {
      label: "Demo Mutations",
      value: String(metrics.demoMutationsApplied),
      ok: true,
      detail: "In-memory only — resets on refresh",
    },
    {
      label: "Validation",
      value: metrics.validationFailures === 0 ? "Pass" : `${metrics.validationFailures} failures`,
      ok: metrics.validationFailures === 0,
      detail: metrics.validationFailures === 0 ? "All snapshots valid" : "Schema validation issues detected",
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">System Health</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
            <div className="flex items-center gap-2.5">
              <span className={`w-2 h-2 rounded-full ${item.ok ? "bg-green-500" : "bg-red-500"}`} />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{item.detail}</span>
              </div>
            </div>
            <span className={`text-sm font-mono ${item.ok ? "text-gray-600 dark:text-gray-400" : "text-red-600 dark:text-red-400 font-semibold"}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
