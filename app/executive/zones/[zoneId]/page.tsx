"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useLiveState } from "@/lib/useLiveState";
import { RiskLevel } from "@/lib/types";
import Topbar from "@/components/Topbar";
import ForecastChart from "@/components/ForecastChart";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

const RISK_BADGE: Record<RiskLevel, string> = {
  [RiskLevel.LOW]: "bg-green-100 text-green-700",
  [RiskLevel.MED]: "bg-amber-100 text-amber-700",
  [RiskLevel.HIGH]: "bg-red-100 text-red-700",
};

export default function ExecZoneDetailPage() {
  const params = useParams();
  const zoneId = params.zoneId as string;
  const { liveState, loading, error } = useLiveState();

  const zone = useMemo(
    () => liveState?.zones.find((z) => z.zone_id === zoneId) ?? null,
    [liveState, zoneId]
  );

  if (loading) return <PageSkeleton />;
  if (error || !liveState) return <ErrorState message={error ?? "Demo Data Unavailable"} backHref="/executive" backLabel="Back to Command Brief" />;

  if (!zone) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-2">Zone &quot;{zoneId}&quot; not found</p>
          <Link href="/executive" className="text-sm text-blue-600 hover:underline">Back to Command Brief</Link>
        </div>
      </div>
    );
  }

  const peakForecast = zone.forecast_30m.reduce((max, fp) => (fp.risk > max ? fp.risk : max), 0);
  const interventionCount = zone.interventions.length;
  const activeRecs = zone.recommendations.length;

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Executive Zone Detail" snapshotId={liveState.snapshot_id} timestamp={liveState.timestamp} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/executive" className="text-sm text-gray-400 hover:text-gray-600">Command Brief</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">{zone.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{zone.name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${RISK_BADGE[zone.risk_level]}`}>
              {zone.risk_level} RISK
            </span>
          </div>
        </div>

        {/* Executive Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Current Risk</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round(zone.risk_score * 100)}%</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Peak Forecast</p>
            <p className="text-2xl font-bold text-gray-900">{Math.round(peakForecast * 100)}%</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Interventions</p>
            <p className="text-2xl font-bold text-gray-900">{interventionCount}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Open Recs</p>
            <p className="text-2xl font-bold text-gray-900">{activeRecs}</p>
          </div>
        </div>

        {/* Forecast */}
        <ForecastChart data={zone.forecast_30m} title={`Risk Forecast — ${zone.name}`} />

        {/* Recommendations Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recommendations</h3>
          {zone.recommendations.length === 0 ? (
            <p className="text-sm text-gray-400">No active recommendations</p>
          ) : (
            <div className="space-y-2">
              {zone.recommendations.map((rec) => (
                <div key={rec.id} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{rec.action}</p>
                    <p className="text-xs text-gray-500">{rec.impact}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-gray-400">{Math.round(rec.confidence * 100)}% conf.</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      rec.priority === "HIGH" ? "bg-red-100 text-red-700" :
                      rec.priority === "MED" ? "bg-amber-100 text-amber-700" :
                      "bg-green-100 text-green-700"
                    }`}>{rec.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interventions */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Active Interventions</h3>
          {zone.interventions.length === 0 ? (
            <p className="text-sm text-gray-400">No interventions applied</p>
          ) : (
            <div className="space-y-2">
              {zone.interventions.map((int) => (
                <div key={int.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{int.action}</p>
                    <p className="text-xs text-gray-400">Applied: {int.applied_at}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    int.status === "active" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}>{int.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
