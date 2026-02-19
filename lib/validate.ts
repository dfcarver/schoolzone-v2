import { LiveState, RiskLevel } from "./types";
import * as logger from "./logger";
import { recordValidationFailure } from "./metrics";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_RISK_LEVELS = new Set<string>(["LOW", "MED", "HIGH"]);

export function validateLiveState(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("LiveState must be a non-null object");
    return fail(errors, warnings);
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.snapshot_id !== "string" || obj.snapshot_id.length === 0) {
    errors.push("snapshot_id must be a non-empty string");
  }
  if (typeof obj.timestamp !== "string" || obj.timestamp.length === 0) {
    errors.push("timestamp must be a non-empty string");
  }
  if (typeof obj.district_risk !== "string" || !VALID_RISK_LEVELS.has(obj.district_risk as string)) {
    errors.push(`district_risk must be one of LOW, MED, HIGH; got "${obj.district_risk}"`);
  }
  if (typeof obj.active_alerts !== "number" || obj.active_alerts < 0) {
    errors.push("active_alerts must be a non-negative number");
  }
  if (typeof obj.avg_latency_ms !== "number") {
    errors.push("avg_latency_ms must be a number");
  }
  if (typeof obj.camera_health_pct !== "number") {
    errors.push("camera_health_pct must be a number");
  }
  if (typeof obj.forecast_horizon_min !== "number") {
    errors.push("forecast_horizon_min must be a number");
  }

  if (!Array.isArray(obj.zones)) {
    errors.push("zones must be an array");
  } else {
    for (let i = 0; i < obj.zones.length; i++) {
      const zoneErrors = validateZone(obj.zones[i], i);
      errors.push(...zoneErrors);
    }
  }

  if (errors.length > 0) {
    return fail(errors, warnings);
  }

  // Warnings for soft issues
  const ls = data as LiveState;
  if (ls.avg_latency_ms > 200) {
    warnings.push(`High latency: ${ls.avg_latency_ms}ms`);
  }
  if (ls.camera_health_pct < 90) {
    warnings.push(`Low camera health: ${ls.camera_health_pct}%`);
  }

  return { valid: true, errors: [], warnings };
}

function validateZone(zone: unknown, index: number): string[] {
  const errs: string[] = [];
  const prefix = `zones[${index}]`;

  if (!zone || typeof zone !== "object") {
    errs.push(`${prefix} must be a non-null object`);
    return errs;
  }

  const z = zone as Record<string, unknown>;

  if (typeof z.zone_id !== "string" || z.zone_id.length === 0) {
    errs.push(`${prefix}.zone_id must be a non-empty string`);
  }
  if (typeof z.name !== "string" || z.name.length === 0) {
    errs.push(`${prefix}.name must be a non-empty string`);
  }
  if (typeof z.risk_level !== "string" || !VALID_RISK_LEVELS.has(z.risk_level as string)) {
    errs.push(`${prefix}.risk_level invalid`);
  }
  if (typeof z.risk_score !== "number" || z.risk_score < 0 || z.risk_score > 1) {
    errs.push(`${prefix}.risk_score must be 0..1`);
  }
  if (!Array.isArray(z.forecast_30m)) {
    errs.push(`${prefix}.forecast_30m must be an array`);
  }
  if (!Array.isArray(z.recommendations)) {
    errs.push(`${prefix}.recommendations must be an array`);
  }
  if (!Array.isArray(z.events)) {
    errs.push(`${prefix}.events must be an array`);
  }
  if (!Array.isArray(z.interventions)) {
    errs.push(`${prefix}.interventions must be an array`);
  }

  return errs;
}

function fail(errors: string[], warnings: string[]): ValidationResult {
  for (const e of errors) {
    logger.error(`Validation: ${e}`);
  }
  recordValidationFailure();
  return { valid: false, errors, warnings };
}
