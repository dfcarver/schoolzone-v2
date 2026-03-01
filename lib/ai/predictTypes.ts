import { ForecastPoint } from "@/lib/types";

export interface PredictRequest {
  zone_id: string;
  zone_name: string;
  risk_score: number;
  risk_level: string;
  speed_avg_mph: number;
  pedestrian_count: number;
  vehicle_count: number;
  baseline_forecast: ForecastPoint[];
  active_interventions: string[]; // human-readable action strings
}

export interface PredictedPoint {
  horizon_minutes: number;
  predicted_risk: number;
  confidence: number;
}

export interface PredictResponse {
  headline: string;
  trend: "rising" | "stable" | "falling";
  intervention_impact: string;
  predicted_forecast: PredictedPoint[];
}
