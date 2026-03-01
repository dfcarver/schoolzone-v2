"use client";

import { useEffect, useState } from "react";
import { StoredIntervention } from "@/lib/interventionStore";

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 30) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

interface InterventionFeedProps {
  history: StoredIntervention[];
}

export default function InterventionFeed({ history }: InterventionFeedProps) {
  // Tick every 30s to keep relative times fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const recent = [...history].reverse().slice(0, 10);
  const recentCount = history.filter((i) => Date.now() - i.appliedAt < 10 * 60 * 1000).length;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Intervention Audit Trail</h3>
        {recentCount > 0 && (
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
            {recentCount} in last 10 min
          </span>
        )}
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">No interventions dispatched this session</p>
      ) : (
        <div className="space-y-0">
          {recent.map((item, i) => (
            <div
              key={`${item.zoneId}-${item.appliedAt}-${i}`}
              className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800 last:border-0"
            >
              <div className="flex flex-col items-center shrink-0 pt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {i < recent.length - 1 && (
                  <span className="w-px flex-1 bg-gray-100 dark:bg-gray-800 mt-1 min-h-[16px]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-snug">
                  {item.recommendation.action}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {item.zoneId} · {relativeTime(item.appliedAt)}
                </p>
              </div>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded shrink-0 ${
                item.recommendation.priority === "HIGH"
                  ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                  : item.recommendation.priority === "MED"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
              }`}>
                {item.recommendation.priority}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
