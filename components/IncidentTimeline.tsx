"use client";

import { useState } from "react";
import { IncidentEvent } from "@/lib/types";

const EVENT_TYPE_COLORS: Record<string, string> = {
  detection: "bg-blue-500",
  intervention: "bg-green-500",
  alert: "bg-amber-500",
  incident: "bg-red-500",
  response: "bg-purple-500",
  resolution: "bg-teal-500",
};

interface IncidentTimelineProps {
  events: IncidentEvent[];
}

export default function IncidentTimeline({ events }: IncidentTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!events || events.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <p className="text-sm text-gray-400">No events to display</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Event Timeline
      </h3>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />
        <div className="space-y-4">
          {events.map((event) => {
            const dotColor =
              EVENT_TYPE_COLORS[event.type] || "bg-gray-400";
            const isExpanded = expandedId === event.event_id;
            const d = new Date(event.timestamp);
            const time = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

            return (
              <div key={event.event_id} className="relative pl-8">
                <div
                  className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full ${dotColor} ring-2 ring-white`}
                />
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : event.event_id)
                  }
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">
                      {time}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase">
                      {event.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 mt-0.5">
                    {event.description}
                  </p>
                </button>
                {isExpanded && event.payload && (
                  <div className="mt-2 bg-gray-50 rounded-md p-3 text-xs font-mono text-gray-600 overflow-x-auto">
                    <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
