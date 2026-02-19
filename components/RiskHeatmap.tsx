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
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Portfolio Heatmap</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["NOW", "+15", "+30"] as TimeHorizon[]).map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                horizon === h
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map((entry) => {
          const risk = getRisk(entry);
          return (
            <button
              key={entry.zone_id}
              onClick={() => router.push(`${linkPrefix}/${entry.zone_id}`)}
              className={`text-left border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer ${riskBg(risk)}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-900 truncate">{entry.name}</span>
                <span className={`w-3 h-3 rounded-full ${riskColor(risk)}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{risk}%</div>
              <div className="text-[10px] text-gray-500 uppercase mt-1">
                Risk {horizon === "NOW" ? "Now" : `at ${horizon} min`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
