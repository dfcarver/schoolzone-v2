import { ZoneLiveState } from "@/lib/types";
import { AIBriefRequest, DriftStatus } from "./types";

/**
 * Map internal drift status to AI brief drift status.
 * Internal uses "DRIFT"; AI spec uses "CRITICAL".
 */
function mapDriftStatus(internal: "NORMAL" | "WARNING" | "DRIFT"): DriftStatus {
  if (internal === "DRIFT") return "CRITICAL";
  return internal;
}

/**
 * Compute a simple congestion index from vehicle count and average speed.
 */
function computeCongestionIndex(zone: ZoneLiveState): number {
  const raw = zone.vehicle_count / Math.max(zone.speed_avg_mph, 1);
  return Math.round(raw * 100) / 100;
}

export function buildAIBriefRequest(
  zone: ZoneLiveState,
  driftStatus: "NORMAL" | "WARNING" | "DRIFT"
): AIBriefRequest {
  return {
    corridor_id: zone.zone_id,
    corridor_name: zone.name,
    drift_status: mapDriftStatus(driftStatus),
    risk_score: zone.risk_score,
    congestion_index: computeCongestionIndex(zone),
    forecast: zone.forecast_30m.map((fp, i) => ({
      horizon_minutes: (i + 1) * 5,
      predicted_risk_score: fp.risk,
      predicted_congestion_index: Math.round(fp.risk * computeCongestionIndex(zone) * 100) / 100,
      confidence_score: fp.confidence,
    })),
    active_interventions: zone.interventions.map((intv) => ({
      intervention_id: intv.id,
      status: intv.status === "active" || intv.status === "completed" ? "APPROVED" as const : "PENDING" as const,
      proposed_action: intv.action,
    })),
  };
}
