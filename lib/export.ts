import { Incident } from "./types";
import { DistrictRollup, ActiveMitigation } from "./rollups";
import type { StoredIntervention } from "./interventionStore";

function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportIncidentJSON(incident: Incident): void {
  downloadJSON(incident, `${incident.incident_id}.json`);
}

export interface ExecutiveSummaryExport {
  generated_at: string;
  district_risk_index: number;
  forecasted_high_risk_window: string;
  forecasted_high_risk_value: number;
  interventions_applied_today: number;
  effectiveness_pct: number;
  governance_status: string;
  operator_interventions: Array<{
    zone_id: string;
    action: string;
    priority: string;
    applied_at: string;
  }>;
  active_mitigations: ActiveMitigation[];
}

export function exportExecutiveSummaryJSON(
  rollup: DistrictRollup,
  interventionHistory: StoredIntervention[] = [],
  activeMitigations: ActiveMitigation[] = []
): void {
  const payload: ExecutiveSummaryExport = {
    generated_at: new Date().toISOString(),
    district_risk_index: rollup.districtRiskIndex,
    forecasted_high_risk_window: rollup.forecastedHighRiskWindow,
    forecasted_high_risk_value: rollup.forecastedHighRiskValue,
    interventions_applied_today: rollup.interventionsAppliedToday,
    effectiveness_pct: rollup.effectiveness,
    governance_status: rollup.governanceStatus,
    operator_interventions: interventionHistory.map((i) => ({
      zone_id: i.zoneId,
      action: i.recommendation.action,
      priority: i.recommendation.priority,
      applied_at: new Date(i.appliedAt).toISOString(),
    })),
    active_mitigations: activeMitigations,
  };
  downloadJSON(payload, `executive-summary-${Date.now()}.json`);
}

export function exportProcurementJSON(data: unknown, section: string): void {
  downloadJSON(data, `procurement-${section}-${Date.now()}.json`);
}
