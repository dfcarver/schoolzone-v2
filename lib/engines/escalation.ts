import { EscalationInput, EscalationOutput, DriftWeight } from "./types";
import { clamp01, mean } from "./normalize";

const DRIFT_WEIGHTS: Record<DriftWeight, number> = {
  NORMAL: 0.0,
  WARNING: 0.3,
  CRITICAL: 0.6,
};

/**
 * Compute escalation probability from corridor telemetry.
 * Pure function — no side effects, fully deterministic.
 */
export function computeEscalation(input: EscalationInput): EscalationOutput {
  const { risk_score, congestion_index, drift_status, forecast } = input;

  // Find the 30-minute horizon forecast point (last point, or closest to 30 min)
  const lastForecast = forecast.length > 0 ? forecast[forecast.length - 1] : null;

  const risk_trend = lastForecast
    ? lastForecast.predicted_risk_score - risk_score
    : 0;

  const congestion_trend = lastForecast
    ? lastForecast.predicted_congestion_index - congestion_index
    : 0;

  const confidenceScores = forecast
    .map((f) => f.confidence_score)
    .filter((c): c is number => c != null);
  const confidence_factor = confidenceScores.length > 0 ? mean(confidenceScores) : 1.0;

  const drift_weight = DRIFT_WEIGHTS[drift_status] ?? 0;

  // Weighted sum per spec
  const raw =
    0.45 * risk_trend +
    0.25 * congestion_trend +
    0.20 * drift_weight +
    0.10 * (1 - confidence_factor);

  const escalation_probability = clamp01(raw);

  return {
    escalation_probability,
    components: {
      risk_trend,
      congestion_trend,
      drift_weight,
      confidence_factor,
    },
  };
}
