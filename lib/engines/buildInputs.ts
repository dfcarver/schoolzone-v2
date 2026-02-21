import { ZoneLiveState } from "@/lib/types";
import { EscalationInput, AnomalyInput, DriftWeight } from "./types";

/**
 * Map internal drift status to engine drift weight.
 */
function mapDrift(status: "NORMAL" | "WARNING" | "DRIFT"): DriftWeight {
  if (status === "DRIFT") return "CRITICAL";
  return status;
}

/**
 * Compute congestion index from zone telemetry.
 */
function congestionIndex(zone: ZoneLiveState): number {
  return Math.round((zone.vehicle_count / Math.max(zone.speed_avg_mph, 1)) * 100) / 100;
}

/**
 * Build EscalationInput from zone + drift status.
 */
export function buildEscalationInput(
  zone: ZoneLiveState,
  driftStatus: "NORMAL" | "WARNING" | "DRIFT"
): EscalationInput {
  const ci = congestionIndex(zone);
  return {
    risk_score: zone.risk_score,
    congestion_index: ci,
    drift_status: mapDrift(driftStatus),
    forecast: zone.forecast_30m.map((fp, i) => ({
      horizon_minutes: (i + 1) * 5,
      predicted_risk_score: fp.risk,
      predicted_congestion_index: Math.round(fp.risk * ci * 100) / 100,
      confidence_score: fp.confidence,
    })),
  };
}

/**
 * Build AnomalyInput from zone telemetry.
 * Uses forecast data to derive expected values.
 */
export function buildAnomalyInput(zone: ZoneLiveState): AnomalyInput {
  // Forecast vehicle count: estimate from first forecast point risk * current ratio
  const forecastRisk = zone.forecast_30m.length > 0 ? zone.forecast_30m[0].risk : zone.risk_score;
  const vehicleRiskRatio = zone.risk_score > 0
    ? zone.vehicle_count / zone.risk_score
    : zone.vehicle_count;
  const forecast_vehicle_count = Math.round(forecastRisk * vehicleRiskRatio);

  // Speed samples: derive synthetic samples from avg speed (deterministic spread)
  const base = zone.speed_avg_mph;
  const current_speed_samples = [
    base * 0.85,
    base * 0.92,
    base,
    base * 1.05,
    base * 1.12,
  ];

  // Forecast upper bound: max of forecast confidence intervals
  const forecast_upper_bound = zone.forecast_30m.length > 0
    ? Math.max(...zone.forecast_30m.map((fp) => fp.risk + (1 - fp.confidence) * 0.2))
    : 1.0;

  return {
    actual_vehicle_count: zone.vehicle_count,
    forecast_vehicle_count,
    current_speed_samples,
    actual_risk: zone.risk_score,
    forecast_upper_bound,
  };
}
