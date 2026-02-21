import { ForecastPoint } from "@/lib/types";

// ---------------------------------------------------------------------------
// Escalation Probability Forecasting Engine
// ---------------------------------------------------------------------------

export type DriftWeight = "NORMAL" | "WARNING" | "CRITICAL";

export interface EscalationInput {
  risk_score: number;
  congestion_index: number;
  drift_status: DriftWeight;
  forecast: Array<{
    horizon_minutes: number;
    predicted_risk_score: number;
    predicted_congestion_index: number;
    confidence_score?: number;
  }>;
}

export interface EscalationComponents {
  risk_trend: number;
  congestion_trend: number;
  drift_weight: number;
  confidence_factor: number;
}

export interface EscalationOutput {
  escalation_probability: number;
  components: EscalationComponents;
}

// ---------------------------------------------------------------------------
// Anomaly Detection Layer
// ---------------------------------------------------------------------------

export interface AnomalyInput {
  actual_vehicle_count: number;
  forecast_vehicle_count: number;
  current_speed_samples: number[];
  actual_risk: number;
  forecast_upper_bound: number;
}

export type AnomalyClassification = "ADVISORY" | "SIGNIFICANT" | "CRITICAL";

export interface AnomalyOutput {
  anomaly_score: number;
  classification: AnomalyClassification;
}

// ---------------------------------------------------------------------------
// What-If Simulation Engine
// ---------------------------------------------------------------------------

export type InterventionType = "SIGNAL_TIMING" | "TRAFFIC_DIVERSION" | "ENFORCEMENT";

export interface SimulationInput {
  baseline_forecast: ForecastPoint[];
  escalation_probability: number;
  intervention_type: InterventionType;
}

export interface SimulationOutput {
  adjusted_forecast: ForecastPoint[];
  adjusted_escalation_probability: number;
  risk_delta: number;
}
