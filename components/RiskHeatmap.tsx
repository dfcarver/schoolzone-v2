"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZoneHeatmapEntry } from "@/lib/rollups";

interface RiskHeatmapProps {
  entries: ZoneHeatmapEntry[];
  linkPrefix?: string;
}

type TimeHorizon = "NOW" | "+15" | "+30";

function riskColor(value: number): string {
  if (value >= 60) return "bg-red-500";
  if (value >= 40) return "bg-amber-400";
  return "bg-green-500";
}

function riskBg(value: number): string {
  if (value >= 60) return "bg-red-50 border-red-200";
  if (value >= 40) return "bg-amber-50 border-amber-200";
  return "bg-green-50 border-green-200";
}

export default function RiskHeatmap({ entries, linkPrefix = "/executive/zones" }: RiskHeatmapProps) {
  const [horizon, setHorizon] = useState<TimeHorizon>("NOW");
  const router = useRouter();

  function getRisk(entry: ZoneHeatmapEntry): number {
    switch (horizon) {
      case "NOW": return entry.riskNow;
      case "+15": return entry.risk15;
      case "+30": return entry.risk30;
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100">Portfolio Heatmap</h3>
        <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          {(["NOW", "+15", "+30"] as TimeHorizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors ${
                horizon === h
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
        {entries.map((entry) => {
          const risk = getRisk(entry);
          return (
            <button
              key={entry.zone_id}
              onClick={() => router.push(`${linkPrefix}/${entry.zone_id}`)}
              className={`text-left border rounded-md p-1.5 hover:shadow-sm transition-shadow cursor-pointer ${riskBg(risk)}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium text-gray-900 dark:text-gray-100 truncate leading-tight">{entry.name}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ml-1 ${riskColor(risk)}`} />
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">{risk}%</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">
                  {horizon === "NOW" ? "now" : `+${horizon.replace("+", "")}m`}
                </span>
                {entry.hasActiveIntervention && (
                  <span className="text-[8px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1 py-0.5 rounded leading-none">
                    ✓ Active
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
