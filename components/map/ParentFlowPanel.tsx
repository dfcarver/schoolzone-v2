"use client";

import { useMemo } from "react";
import { computeParentFlow, ParentFlowSnapshot } from "@/lib/mapFeatures";

interface SchoolInfo {
  id: string;
  name: string;
  type: string;
  enrollment: number;
}

interface ParentFlowPanelProps {
  schools: SchoolInfo[];
  timeMin: number;
}

function queueColor(length: number, enrollment: number): string {
  const ratio = length / (enrollment * 0.65);
  if (ratio >= 0.6) return "#dc2626";
  if (ratio >= 0.35) return "#f59e0b";
  if (ratio >= 0.15) return "#facc15";
  return "#22c55e";
}

export default function ParentFlowPanel({ schools, timeMin }: ParentFlowPanelProps) {
  const flows = useMemo(() => {
    return schools.map((s) => ({
      school: s,
      flow: computeParentFlow(s.enrollment, s.type, timeMin),
    }));
  }, [schools, timeMin]);

  const anyActive = flows.some((f) => f.flow.queueLength > 0);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Parent Pick-up Queue
        {!anyActive && (
          <span className="ml-2 text-[10px] font-normal text-gray-400">No active queues at this time</span>
        )}
      </h4>

      <div className="space-y-2.5">
        {flows.map(({ school, flow }) => {
          const maxQueue = Math.round(school.enrollment * 0.65 * 0.4);
          const pct = maxQueue > 0 ? Math.min(1, flow.queueLength / maxQueue) : 0;
          const color = queueColor(flow.queueLength, school.enrollment);

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
