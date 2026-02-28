"use client";

import { useMemo, useState } from "react";
import { computeParentFlow } from "@/lib/mapFeatures";
import { formatTime } from "@/lib/hooks/useCongestionEngine";
import FeatureHint from "./FeatureHint";

interface SchoolInfo {
  id: string;
  name: string;
  type: string;
  enrollment: number;
}

interface ParentFlowPanelProps {
  schools: SchoolInfo[];
  timeMin: number;
  dismissalOverrides: Record<string, number>;
  onChangeDismissal: (schoolId: string, minuteOfDay: number) => void;
}

const DISMISSAL_DEFAULTS: Record<string, number> = {
  elementary: 15 * 60,
  middle: 15 * 60 + 15,
  high: 15 * 60 + 30,
};

function queueColor(length: number, enrollment: number): string {
  const ratio = length / (enrollment * 0.65);
  if (ratio >= 0.6) return "#dc2626";
  if (ratio >= 0.35) return "#f59e0b";
  if (ratio >= 0.15) return "#facc15";
  return "#22c55e";
}

export default function ParentFlowPanel({
  schools,
  timeMin,
  dismissalOverrides,
  onChangeDismissal,
}: ParentFlowPanelProps) {
  const [editingDismissal, setEditingDismissal] = useState<string | null>(null);

  const flows = useMemo(() => {
    return schools.map((s) => ({
      school: s,
      flow: computeParentFlow(
        s.enrollment,
        s.type,
        timeMin,
        dismissalOverrides[s.id]
      ),
      dismissalMin: dismissalOverrides[s.id] ?? DISMISSAL_DEFAULTS[s.type] ?? 15 * 60,
    }));
  }, [schools, timeMin, dismissalOverrides]);

  const anyActive = flows.some((f) => f.flow.queueLength > 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Parent Pick-up Queue
        {!anyActive && (
          <span className="ml-2 text-[10px] font-normal text-gray-400">No active queues at this time</span>
        )}
      </h4>
      <FeatureHint>
        Queue bars peak around dismissal time — most active 2:45–3:45 PM. Click the dismissal time for any school to slide it earlier or later and watch the queue shift. Color indicates fullness: green → yellow → orange → red.
      </FeatureHint>

      <div className="space-y-3">
        {flows.map(({ school, flow, dismissalMin }) => {
          const maxQueue = Math.round(school.enrollment * 0.65 * 0.4);
          const pct = maxQueue > 0 ? Math.min(1, flow.queueLength / maxQueue) : 0;
          const color = queueColor(flow.queueLength, school.enrollment);
          const isEditing = editingDismissal === school.id;

          return (
            <div key={school.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">
                  {school.name}
                </span>
                <div className="flex items-center gap-3 text-[10px] shrink-0">
                  {flow.queueLength > 0 ? (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">
                        {flow.queueLength} cars
                      </span>
                      <span style={{ color }} className="font-medium">
                        ~{flow.waitTimeMin} min wait
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">No queue</span>
                  )}
                </div>
              </div>

              {/* Queue bar */}
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${pct * 100}%`, backgroundColor: color }}
                />
              </div>

              {/* Flow rates */}
              {flow.queueLength > 0 && (
                <div className="flex gap-4 text-[9px] text-gray-400 dark:text-gray-500">
                  <span>↓ Arriving: {flow.arrivalRate}/min</span>
                  <span>↑ Departing: {flow.departureRate}/min</span>
                  <span className="capitalize">{school.type} · {school.enrollment} students</span>
                </div>
              )}

              {/* Dismissal time editor */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0">Dismissal:</span>
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="range"
                      min={12 * 60}
                      max={17 * 60}
                      step={5}
                      value={dismissalMin}
                      onChange={(e) => onChangeDismissal(school.id, Number(e.target.value))}
                      className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
                    />
                    <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 w-16 shrink-0">
                      {formatTime(dismissalMin)}
                    </span>
                    <button
                      onClick={() => setEditingDismissal(null)}
                      className="text-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingDismissal(school.id)}
                    className="text-[9px] text-blue-500 dark:text-blue-400 hover:underline"
                  >
                    {formatTime(dismissalMin)}
                    {dismissalOverrides[school.id] !== undefined && (
                      <span className="ml-1 text-amber-500">(custom)</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
