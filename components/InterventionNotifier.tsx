"use client";

import { useEffect, useRef } from "react";
import { useLiveState } from "@/lib/useLiveState";
import { useNotifications } from "@/lib/notifications";

export default function InterventionNotifier() {
  const { appliedHistory } = useLiveState();
  const { push } = useNotifications();
  const lastSeenRef = useRef(0);

  useEffect(() => {
    const newItems = appliedHistory.slice(lastSeenRef.current);
    lastSeenRef.current = appliedHistory.length;

    for (const item of newItems) {
      // Skip items from snapshot replay (older than 10s) to avoid notification flood on page load
      if (Date.now() - item.appliedAt > 10_000) continue;
      push({
        title: "Intervention Dispatched",
        body: item.recommendation.action,
        severity: "info",
        zone: item.zoneId,
        source: "operator",
      });
    }
  }, [appliedHistory, push]);

  return null;
}
