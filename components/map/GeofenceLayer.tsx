"use client";

import { useState } from "react";
import { Circle, InfoWindow } from "@react-google-maps/api";
import { GeofenceConfig } from "@/lib/mapFeatures";

interface CorridorInfo {
  id: string;
  schoolName: string;
  lat: number;
  lng: number;
  congestion: number;
  speedAvg: number;
}

interface GeofenceLayerProps {
  corridors: CorridorInfo[];
  geofences: GeofenceConfig[];
  onUpdateGeofence: (zoneId: string, updates: Partial<GeofenceConfig>) => void;
  visible: boolean;
}

function isBreached(corridor: CorridorInfo, gf: GeofenceConfig): boolean {
  return corridor.congestion > gf.congestionThreshold;
}

export default function GeofenceLayer({ corridors, geofences, onUpdateGeofence, visible }: GeofenceLayerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!visible) return null;

  return (
    <>
      {geofences.filter((gf) => gf.enabled).map((gf) => {
        const corridor = corridors.find((c) => c.id === gf.zoneId);
        if (!corridor) return null;

        const breached = isBreached(corridor, gf);

        return (
          <Circle
            key={`geofence-${gf.zoneId}`}
            center={{ lat: corridor.lat, lng: corridor.lng }}
            radius={gf.radiusMeters}
            onClick={() => setEditingId(gf.zoneId)}
            options={{
              fillColor: breached ? "#dc2626" : "#3b82f6",
              fillOpacity: breached ? 0.12 : 0.06,
              strokeColor: breached ? "#dc2626" : "#3b82f6",
              strokeOpacity: breached ? 0.8 : 0.4,
              strokeWeight: breached ? 2.5 : 1.5,
              clickable: true,
            }}
          />
        );
      })}

      {editingId && (() => {
        const gf = geofences.find((g) => g.zoneId === editingId);
        const corridor = corridors.find((c) => c.id === editingId);
        if (!gf || !corridor) return null;
        const breached = isBreached(corridor, gf);

        return (
          <InfoWindow
            position={{ lat: corridor.lat, lng: corridor.lng }}
            onCloseClick={() => setEditingId(null)}
          >
            <div className="p-2 min-w-[240px]">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {corridor.schoolName} — Safety Zone
              </p>

              {breached && (
                <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5 mb-2">
                  <p className="text-[11px] font-medium text-red-700">
                    ⚠ ALERT: Congestion ({Math.round(corridor.congestion * 100)}%) exceeds threshold ({Math.round(gf.congestionThreshold * 100)}%)
                  </p>
                </div>
              )}

              <div className="space-y-2 text-[11px]">
                <div>
                  <label className="text-gray-500 block mb-0.5">Perimeter Radius</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={100}
                      max={600}
                      step={25}
                      value={gf.radiusMeters}
                      onChange={(e) => onUpdateGeofence(gf.zoneId, { radiusMeters: Number(e.target.value) })}
                      className="flex-1 h-1.5 accent-blue-600"
                    />
                    <span className="text-gray-700 font-medium w-[45px] text-right">{gf.radiusMeters}m</span>
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 block mb-0.5">Congestion Alert Threshold</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0.2}
                      max={0.9}
                      step={0.05}
                      value={gf.congestionThreshold}
                      onChange={(e) => onUpdateGeofence(gf.zoneId, { congestionThreshold: Number(e.target.value) })}
                      className="flex-1 h-1.5 accent-blue-600"
                    />
                    <span className="text-gray-700 font-medium w-[40px] text-right">{Math.round(gf.congestionThreshold * 100)}%</span>
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 block mb-0.5">Speed Limit</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={10}
                      max={35}
                      step={5}
                      value={gf.speedLimitMph}
                      onChange={(e) => onUpdateGeofence(gf.zoneId, { speedLimitMph: Number(e.target.value) })}
                      className="flex-1 h-1.5 accent-blue-600"
                    />
                    <span className="text-gray-700 font-medium w-[50px] text-right">{gf.speedLimitMph} mph</span>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                  Current: {Math.round(corridor.congestion * 100)}% congestion
                </span>
                <button
                  onClick={() => onUpdateGeofence(gf.zoneId, { enabled: false })}
                  className="text-[10px] text-red-500 hover:text-red-700"
                >
                  Disable Zone
                </button>
              </div>
            </div>
          </InfoWindow>
        );
      })()}
    </>
  );
}
