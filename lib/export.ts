import { Incident } from "./types";
import { DistrictRollup } from "./rollups";

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
}

export function exportExecutiveSummaryJSON(rollup: DistrictRollup): void {
  const payload: ExecutiveSummaryExport = {
    generated_at: new Date().toISOString(),
    district_risk_index: rollup.districtRiskIndex,
    forecasted_high_risk_window: rollup.forecastedHighRiskWindow,
    forecasted_high_risk_value: rollup.forecastedHighRiskValue,
    interventions_applied_today: rollup.interventionsAppliedToday,
    effectiveness_pct: rollup.effectiveness,
    governance_status: rollup.governanceStatus,
  };
  downloadJSON(payload, `executive-summary-${Date.now()}.json`);
}
