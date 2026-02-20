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

// ---------------------------------------------------------------------------
// Procurement Pack Types
// ---------------------------------------------------------------------------

export type ControlStatus = "Implemented" | "Demo" | "Planned";
export type RiskStatus = "Open" | "Mitigated" | "Monitoring" | "Accepted";
export type IntegrationStatus = "Ready" | "In Progress" | "Planned" | "Not Started";
export type PhaseStatus = "Complete" | "Active" | "Planned";

export interface ArchitecturePrinciple {
  id: string;
  name: string;
  description: string;
}

export interface ArchitectureLayer {
  id: string;
  name: string;
  description: string;
  components: string[];
}

export interface ContractBoundary {
  title: string;
  description: string;
  schemas: string[];
  reference: string;
}

export interface ArchitectureData {
  title: string;
  subtitle: string;
  principles: ArchitecturePrinciple[];
  layers: ArchitectureLayer[];
  contractBoundary: ContractBoundary;
}

export interface SecurityControl {
  id: string;
  domain: string;
  statement: string;
  mechanism: string;
  evidence: string;
  status: ControlStatus;
}

export interface SecurityData {
  title: string;
  subtitle: string;
  controls: SecurityControl[];
  statements: string[];
}

export interface PerformanceMetric {
  id: string;
  metric: string;
  target: string;
  current: string;
  unit: string;
  notes: string;
}

export interface PerformanceData {
  title: string;
  subtitle: string;
  metrics: PerformanceMetric[];
  disclaimers: string[];
}

export interface PhaseDeliverable {
  name: string;
  description: string;
}

export interface DeploymentPhase {
  id: string;
  name: string;
  status: PhaseStatus;
  scope: string;
  integrations: string[];
  training: string[];
  deliverables: PhaseDeliverable[];
  exitCriteria: string[];
}

export interface DeploymentData {
  title: string;
  subtitle: string;
  phases: DeploymentPhase[];
}

export interface RiskEntry {
  id: string;
  risk: string;
  impact: string;
  likelihood: string;
  mitigation: string;
  owner: string;
  status: RiskStatus;
}

export interface RiskMatrixData {
  title: string;
  subtitle: string;
  risks: RiskEntry[];
}

export interface IntegrationItem {
  id: string;
  system: string;
  description: string;
  contractType: string;
  status: IntegrationStatus;
  notes: string;
}

export interface IntegrationBoundary {
  title: string;
  description: string;
  principles: string[];
}

export interface IntegrationData {
  title: string;
  subtitle: string;
  integrations: IntegrationItem[];
  boundary: IntegrationBoundary;
}
