import { PredictRequest } from "./predictTypes";

export function buildPredictPrompt(req: PredictRequest): string {
  const interventionClause =
    req.active_interventions.length > 0
      ? `ACTIVE INTERVENTIONS (recently dispatched, adjust forecast accordingly):\n${req.active_interventions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : "ACTIVE INTERVENTIONS: None. Predicted forecast should closely follow the baseline.";

  return `You are a risk forecasting engine for a school zone safety monitoring system in Abu Dhabi, UAE.

CURRENT ZONE STATE:
- Zone: ${req.zone_name} (${req.zone_id})
- Risk Score: ${req.risk_score.toFixed(3)} (${req.risk_level} risk)
- Speed Average: ${req.speed_avg_mph} mph
- Pedestrian Count: ${req.pedestrian_count}
- Vehicle Count: ${req.vehicle_count}

BASELINE SENSOR FORECAST (next 30 minutes, before interventions):
${JSON.stringify(req.baseline_forecast, null, 2)}

${interventionClause}

INSTRUCTIONS:
1. Produce a predicted 30-minute risk forecast (6 points, one per 5 minutes) that accounts for any active interventions reducing risk.
2. Interventions typically reduce risk by 10–25% within 5–15 minutes of dispatch, with effect peaking around 10–20 minutes.
3. If no interventions are active, mirror the baseline closely with minor model uncertainty adjustments.
4. Write a headline (max 10 words) summarising the prediction outlook.
5. Write 1–2 sentences describing intervention impact (or lack thereof).
6. Set trend to "falling" if the average of the last 3 points is lower than the first 3, "rising" if higher, otherwise "stable".

OUTPUT: Respond with ONLY a valid JSON object (no markdown, no code fences):
{
  "headline": "string",
  "trend": "falling" | "stable" | "rising",
  "intervention_impact": "string",
  "predicted_forecast": [
    { "horizon_minutes": 5, "predicted_risk": 0.0, "confidence": 0.0 },
    { "horizon_minutes": 10, "predicted_risk": 0.0, "confidence": 0.0 },
    { "horizon_minutes": 15, "predicted_risk": 0.0, "confidence": 0.0 },
    { "horizon_minutes": 20, "predicted_risk": 0.0, "confidence": 0.0 },
    { "horizon_minutes": 25, "predicted_risk": 0.0, "confidence": 0.0 },
    { "horizon_minutes": 30, "predicted_risk": 0.0, "confidence": 0.0 }
  ]
}`;
}
