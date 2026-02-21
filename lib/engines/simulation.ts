import { ForecastPoint } from "@/lib/types";
import { SimulationInput, SimulationOutput, InterventionType } from "./types";
import { clamp01 } from "./normalize";
import { computeEscalation } from "./escalation";

const INTERVENTION_MULTIPLIERS: Record<InterventionType, number> = {
  SIGNAL_TIMING: 0.18,
  TRAFFIC_DIVERSION: 0.25,
  ENFORCEMENT: 0.12,
};

/**
 * Run a what-if simulation for a proposed intervention.
 * Pure function — does NOT mutate canonical state.
 */
export function computeSimulation(input: SimulationInput): SimulationOutput {
  const { baseline_forecast, escalation_probability, intervention_type } = input;

  const impact_coefficient = INTERVENTION_MULTIPLIERS[intervention_type];

  // Adjust each forecast point — reduce predicted risk proportional to current risk,
  // modulated by escalation probability (base 30% effect + 70% scaled by escalation)
  const escalation_factor = 0.3 + 0.7 * escalation_probability;
  const adjusted_forecast: ForecastPoint[] = baseline_forecast.map((point) => ({
    ...point,
    risk: clamp01(
      point.risk - impact_coefficient * point.risk * escalation_factor
    ),
  }));

  // Compute risk delta: average reduction across all forecast points
  const totalDelta = baseline_forecast.reduce((sum, orig, i) => {
    return sum + (orig.risk - adjusted_forecast[i].risk);
  }, 0);
  const risk_delta = baseline_forecast.length > 0
    ? -(totalDelta / baseline_forecast.length)
    : 0;

  // Recompute escalation with adjusted forecast
  const recomputed = computeEscalation({
    risk_score: adjusted_forecast.length > 0 ? adjusted_forecast[0].risk : 0,
    congestion_index: 0,
    drift_status: "NORMAL",
    forecast: adjusted_forecast.map((fp, i) => ({
      horizon_minutes: (i + 1) * 5,
      predicted_risk_score: fp.risk,
      predicted_congestion_index: 0,
      confidence_score: fp.confidence,
    })),
  });

  return {
    adjusted_forecast,
    adjusted_escalation_probability: recomputed.escalation_probability,
    risk_delta,
  };
}
