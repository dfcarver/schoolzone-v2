export enum RiskLevel {
  LOW = "LOW",
  MED = "MED",
  HIGH = "HIGH",
}

export function deriveRiskLevel(score: number): RiskLevel {
  if (score >= 0.6) return RiskLevel.HIGH;
  if (score >= 0.4) return RiskLevel.MED;
  return RiskLevel.LOW;
}

export enum SnapshotPhase {
  INITIAL = "INITIAL",
  SNAPSHOT_1 = "SNAPSHOT_1",
  SNAPSHOT_2 = "SNAPSHOT_2",
}

export interface ForecastPoint {
  time: string;
  risk: number;
  confidence: number;
}

export interface Recommendation {
  id: string;
  action: string;
  impact: string;
  confidence: number;
  priority: RiskLevel;
}

export interface ZoneEvent {
  time: string;
  type: string;
  detail: string;
}

export type InterventionStatus = "active" | "en_route" | "pending" | "completed";

export interface Intervention {
  id: string;
  action: string;
  applied_at: string;
  status: InterventionStatus;
}

export interface ZoneLiveState {
  zone_id: string;
  name: string;
  risk_level: RiskLevel;
  risk_score: number;
  speed_avg_mph: number;
  pedestrian_count: number;
  vehicle_count: number;
  active_cameras: number;
  total_cameras: number;
  forecast_30m: ForecastPoint[];
  recommendations: Recommendation[];
  events: ZoneEvent[];
  interventions: Intervention[];
}

export interface LiveState {
  snapshot_id: string;
  timestamp: string;
  district_risk: RiskLevel;
  active_alerts: number;
  avg_latency_ms: number;
  camera_health_pct: number;
  forecast_horizon_min: number;
  zones: ZoneLiveState[];
}

export interface IncidentEventPayload {
  [key: string]: string | number | boolean | string[];
}

export interface IncidentEvent {
  event_id: string;
  timestamp: string;
  type: string;
  description: string;
  payload: IncidentEventPayload;
}

export interface ModelMetadata {
  model_name: string;
  model_version: string;
  prediction_confidence: number;
  features_used: string[];
  training_data_range: string;
  inference_latency_ms: number;
}

export type IncidentStatus = "investigating" | "monitoring" | "resolved";

export interface Incident {
  incident_id: string;
  zone_id: string;
  zone_name: string;
  severity: RiskLevel;
  type: string;
  title: string;
  summary: string;
  reported_at: string;
  status: IncidentStatus;
  events: IncidentEvent[];
  model_metadata: ModelMetadata;
}

export interface School {
  zone_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: string;
  enrollment: number;
  cameras: number;
}
