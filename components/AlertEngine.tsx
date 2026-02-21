"use client";

import { useEffect, useRef, useCallback } from "react";
import { useLiveState } from "@/lib/useLiveState";
import { useNotifications, AppNotification } from "@/lib/notifications";
import { ZoneLiveState } from "@/lib/types";

type PushFn = (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;

function checkZone(zone: ZoneLiveState, push: PushFn) {
  if (zone.risk_level === "HIGH") {
    push({
      title: "High Risk Zone",
      body: `${zone.name} risk score at ${Math.round(zone.risk_score * 100)}%. Immediate attention required.`,
      severity: "critical",
      zone: zone.name,
      source: "risk-monitor",
    });
  }
  if (zone.active_cameras < zone.total_cameras) {
    const offline = zone.total_cameras - zone.active_cameras;
    push({
      title: "Camera Offline",
      body: `${offline} camera${offline > 1 ? "s" : ""} offline in ${zone.name}. Coverage degraded.`,
      severity: "warning",
      zone: zone.name,
      source: "infrastructure",
    });
  }
  if (zone.speed_avg_mph > 25) {
    push({
      title: "Speed Alert",
      body: `Average speed in ${zone.name} is ${zone.speed_avg_mph} mph — above school zone limit.`,
      severity: "warning",
      zone: zone.name,
      source: "speed-monitor",
    });
  }
}

export default function AlertEngine() {
  const { liveState } = useLiveState();
  const { push } = useNotifications();
  const prevRef = useRef<string | null>(null); // eslint-disable-line no-undef

  const evaluate = useCallback(() => {
    if (!liveState) return;
    if (prevRef.current === liveState.snapshot_id) return;
    const isFirst = prevRef.current === null;
    prevRef.current = liveState.snapshot_id;
    if (isFirst) return;

    for (const zone of liveState.zones) {
      checkZone(zone, push);
    }

    if (liveState.active_alerts > 3) {
      push({
        title: "Multiple Active Alerts",
        body: `District has ${liveState.active_alerts} active alerts across zones.`,
        severity: "critical",
        source: "district-monitor",
      });
    }
  }, [liveState, push]);

  useEffect(() => {
    evaluate();
  }, [evaluate]);

  return null;
}
