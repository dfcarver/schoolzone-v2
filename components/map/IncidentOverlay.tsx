"use client";

import { useState } from "react";
import { Marker, InfoWindow } from "@react-google-maps/api";
import { MappedIncident } from "@/lib/mapFeatures";
import { RiskLevel } from "@/lib/types";

interface IncidentOverlayProps {
  incidents: MappedIncident[];
  visible: boolean;
}

const SEVERITY_CONFIG: Record<RiskLevel, { color: string; label: string; scale: number }> = {
  HIGH: { color: "#dc2626", label: "High", scale: 14 },
  MED: { color: "#f59e0b", label: "Medium", scale: 12 },
  LOW: { color: "#3b82f6", label: "Low", scale: 10 },
};

function eventTypeIcon(type: string): string {
  switch (type) {
    case "detection": return "🔍";
    case "alert": return "⚠️";
    case "intervention": return "🛡️";
    case "response": return "🚔";
    case "incident": return "💥";
    case "resolution": return "✅";
    default: return "📌";
  }
}

export default function IncidentOverlay({ incidents, visible }: IncidentOverlayProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!visible || incidents.length === 0) return null;

  const selected = incidents.find((i) => i.incident_id === selectedId);

  return (
    <>
      {incidents.map((inc) => {
        const cfg = SEVERITY_CONFIG[inc.severity] ?? SEVERITY_CONFIG.LOW;
        return (
          <Marker
            key={inc.incident_id}
            position={{ lat: inc.lat, lng: inc.lng }}
            title={inc.title}
            onClick={() => setSelectedId(inc.incident_id)}
            icon={{
              path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
              fillColor: cfg.color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1.5,
              anchor: new google.maps.Point(12, 22),
            }}
          />
        );
      })}

      {selected && (
        <InfoWindow
          position={{ lat: selected.lat, lng: selected.lng }}
          onCloseClick={() => setSelectedId(null)}
        >
          <div className="p-2 min-w-[260px] max-w-[320px]">
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              <span
                className="inline-block px-1.5 py-0.5 text-[10px] font-bold text-white rounded"
                style={{ backgroundColor: (SEVERITY_CONFIG[selected.severity] ?? SEVERITY_CONFIG.LOW).color }}
              >
                {selected.severity}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-tight">{selected.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{selected.incident_id} · {selected.zone_name}</p>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-gray-600 leading-relaxed mb-3">{selected.summary}</p>

            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                selected.status === "investigating" ? "bg-red-50 text-red-600" :
                selected.status === "monitoring" ? "bg-amber-50 text-amber-600" :
                "bg-green-50 text-green-600"
              }`}>
                {selected.status}
              </span>
              <span className="text-[10px] text-gray-400">
                {new Date(selected.reported_at).toLocaleString()}
              </span>
            </div>

            {/* Timeline */}
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Event Timeline</p>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {selected.events.map((evt) => (
                  <div key={evt.event_id} className="flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5">{eventTypeIcon(evt.type)}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-800 leading-tight">{evt.description}</p>
                      <p className="text-[9px] text-gray-400">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model info */}
            <div className="border-t border-gray-100 mt-2 pt-2">
              <p className="text-[9px] text-gray-400">
                Model: {selected.model_metadata.model_name} v{selected.model_metadata.model_version} · 
                Confidence: {Math.round(selected.model_metadata.prediction_confidence * 100)}%
              </p>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
