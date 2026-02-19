"use client";

import { useMemo } from "react";
import { useLiveState } from "@/lib/useLiveState";
import Topbar from "@/components/Topbar";
import SystemHealthPanel from "@/components/SystemHealthPanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

interface QueueItem {
  zone_id: string;
  zoneName: string;
  action: string;
  priority: string;
  confidence: number;
  impact: string;
}

const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, MED: 1, LOW: 2 };
const PRIORITY_BADGE: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MED: "bg-amber-100 text-amber-700",
  LOW: "bg-green-100 text-green-700",
};

export default function QueuePage() {
  const { liveState, loading, error } = useLiveState();

  const queue = useMemo<QueueItem[]>(() => {
    if (!liveState) return [];
    const items: QueueItem[] = [];
    for (const zone of liveState.zones) {
      for (const rec of zone.recommendations) {
        items.push({
          zone_id: zone.zone_id,
          zoneName: zone.name,
          action: rec.action,
          priority: rec.priority,
          confidence: rec.confidence,
          impact: rec.impact,
        });
      }
    }
    return items.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9) ||
        b.confidence - a.confidence
    );
  }, [liveState]);

  if (loading) return <PageSkeleton />;
  if (error || !liveState) return <ErrorState message={error ?? "Demo Data Unavailable"} />;

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Work Queue" snapshotId={liveState.snapshot_id} timestamp={liveState.timestamp} />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Recommendation Queue</h1>
          <span className="text-sm text-gray-400">{queue.length} pending item{queue.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Zone</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Impact</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {queue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No pending recommendations</td>
                </tr>
              ) : (
                queue.map((item, i) => (
                  <tr key={`${item.zone_id}-${i}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[item.priority] ?? "bg-gray-100 text-gray-600"}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.zoneName}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium max-w-xs truncate">{item.action}</td>
                    <td className="py-3 px-4 text-gray-500 max-w-xs truncate">{item.impact}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-600">{Math.round(item.confidence * 100)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <SystemHealthPanel liveState={liveState} />
      </div>
    </div>
  );
}
