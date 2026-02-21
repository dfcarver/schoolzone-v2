import { AnomalyInput, AnomalyOutput, AnomalyClassification } from "./types";
import { clamp01, variance, sigmoidNormalize } from "./normalize";

/**
 * Classify anomaly score into severity level.
 */
function classify(score: number): AnomalyClassification {
  if (score > 0.75) return "CRITICAL";
  if (score >= 0.5) return "SIGNIFICANT";
  if (score >= 0.3) return "ADVISORY";
  return "ADVISORY";
}

/**
 * Compute anomaly score from corridor telemetry.
 * Pure function — no side effects, fully deterministic.
 */
export function computeAnomaly(input: AnomalyInput): AnomalyOutput {
  const {
    actual_vehicle_count,
    forecast_vehicle_count,
    current_speed_samples,
    actual_risk,
    forecast_upper_bound,
  } = input;

  // Density deviation: normalized absolute difference
  const density_deviation = sigmoidNormalize(
    Math.abs(actual_vehicle_count - forecast_vehicle_count),
    50
  );

  // Speed variance: normalized variance of speed samples
  const speed_var = sigmoidNormalize(variance(current_speed_samples), 100);

  // Confidence band violation: binary — did actual risk exceed forecast upper bound?
  const confidence_band_violation = actual_risk > forecast_upper_bound ? 1 : 0;

  // Weighted anomaly score
  const raw =
    0.4 * density_deviation +
    0.3 * speed_var +
    0.3 * confidence_band_violation;

  const anomaly_score = clamp01(raw);

  return {
    anomaly_score,
    classification: classify(anomaly_score),
  };
}
