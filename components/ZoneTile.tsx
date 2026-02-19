"use client";

import { useRouter } from "next/navigation";
import { ZoneLiveState } from "@/lib/types";

const RISK_COLORS: Record<string, string> = {
  LOW: "border-green-500 bg-green-50",
  MED: "border-amber-500 bg-amber-50",
  HIGH: "border-red-500 bg-red-50",
};

const RISK_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MED: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

interface ZoneTileProps {
  zone: ZoneLiveState;
}

export default function ZoneTile({ zone }: ZoneTileProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/zones/${zone.zone_id}`)}
      className={`text-left border-l-4 ${RISK_COLORS[zone.risk_level]} rounded-lg p-4 hover:shadow-md transition-shadow bg-white cursor-pointer w-full`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {zone.name}
        </h3>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_BADGE[zone.risk_level]}`}
        >
          {zone.risk_level}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <span className="text-gray-400">Risk Score</span>
          <p className="font-medium text-gray-900">
            {(zone.risk_score * 100).toFixed(0)}%
          </p>
        </div>
        <div>
          <span className="text-gray-400">Avg Speed</span>
          <p className="font-medium text-gray-900">{zone.speed_avg_mph} mph</p>
        </div>
        <div>
          <span className="text-gray-400">Pedestrians</span>
          <p className="font-medium text-gray-900">{zone.pedestrian_count}</p>
        </div>
        <div>
          <span className="text-gray-400">Cameras</span>
          <p className="font-medium text-gray-900">
            {zone.active_cameras}/{zone.total_cameras}
          </p>
        </div>
      </div>
    </button>
  );
}
