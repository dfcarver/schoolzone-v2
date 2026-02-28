import { useEffect } from "react";
import { GeofenceConfig } from "@/lib/mapFeatures";

interface CongestionEntry {
  id: string;
  school: { name: string };
  congestion: number;
}

type PushNotification = (n: {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  zone?: string;
  source?: string;
}) => void;

// ---------------------------------------------------------------------------
// Module-level singleton — survives component remounts within a page session.
// Keys are zone IDs of currently active (breached) geofences.
// ---------------------------------------------------------------------------
const _breachCache = new Set<string>();
const SESSION_KEY = "szv2-breaches";

function loadSessionBreaches(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) raw.split(",").filter(Boolean).forEach((z) => _breachCache.add(z));
  } catch {
    // sessionStorage unavailable
  }
}

function persistSessionBreaches(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, Array.from(_breachCache).join(","));
  } catch {
    // sessionStorage unavailable
  }
}

// Seed from session on module load
loadSessionBreaches();

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGeofenceAlerts(
  congestionData: CongestionEntry[],
  geofences: GeofenceConfig[],
  enabled: boolean,
  pushNotification: PushNotification
): void {
  useEffect(() => {
    if (!enabled) return;

    const currentBreaches = new Set<string>();

    for (const c of congestionData) {
      const gf = geofences.find((g) => g.zoneId === c.id && g.enabled);
      if (gf && c.congestion > gf.congestionThreshold) {
        currentBreaches.add(c.id);
        if (!_breachCache.has(c.id)) {
          _breachCache.add(c.id);
          persistSessionBreaches();
          pushNotification({
            title: `Geofence Alert: ${c.school.name}`,
            body: `Congestion (${Math.round(c.congestion * 100)}%) exceeded ${Math.round(gf.congestionThreshold * 100)}% threshold`,
            severity: "critical",
            zone: c.id,
            source: "geofence",
          });
        }
      }
    }

    // Clear breaches that are no longer active
    Array.from(_breachCache).forEach((zoneId) => {
      if (!currentBreaches.has(zoneId)) {
        _breachCache.delete(zoneId);
      }
    });
    persistSessionBreaches();
  }, [congestionData, geofences, enabled, pushNotification]);
}
