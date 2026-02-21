import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeEscalation } from "../lib/engines/escalation";
import { EscalationInput } from "../lib/engines/types";

describe("computeEscalation", () => {
  const baseInput: EscalationInput = {
    risk_score: 0.5,
    congestion_index: 3.0,
    drift_status: "NORMAL",
    forecast: [
      { horizon_minutes: 5, predicted_risk_score: 0.52, predicted_congestion_index: 3.1, confidence_score: 0.9 },
      { horizon_minutes: 10, predicted_risk_score: 0.55, predicted_congestion_index: 3.3, confidence_score: 0.88 },
      { horizon_minutes: 15, predicted_risk_score: 0.58, predicted_congestion_index: 3.5, confidence_score: 0.85 },
      { horizon_minutes: 20, predicted_risk_score: 0.60, predicted_congestion_index: 3.7, confidence_score: 0.82 },
      { horizon_minutes: 25, predicted_risk_score: 0.63, predicted_congestion_index: 3.9, confidence_score: 0.80 },
      { horizon_minutes: 30, predicted_risk_score: 0.65, predicted_congestion_index: 4.1, confidence_score: 0.78 },
    ],
  };

  it("returns deterministic output for identical input", () => {
    const a = computeEscalation(baseInput);
    const b = computeEscalation(baseInput);
    assert.deepStrictEqual(a, b);
  });

  it("produces escalation_probability in [0, 1]", () => {
    const result = computeEscalation(baseInput);
    assert.ok(result.escalation_probability >= 0);
    assert.ok(result.escalation_probability <= 1);
  });

  it("produces no NaN values", () => {
    const result = computeEscalation(baseInput);
    assert.ok(!Number.isNaN(result.escalation_probability));
    assert.ok(!Number.isNaN(result.components.risk_trend));
    assert.ok(!Number.isNaN(result.components.congestion_trend));
    assert.ok(!Number.isNaN(result.components.drift_weight));
    assert.ok(!Number.isNaN(result.components.confidence_factor));
  });

  it("handles empty forecast", () => {
    const input: EscalationInput = { ...baseInput, forecast: [] };
    const result = computeEscalation(input);
    assert.ok(result.escalation_probability >= 0);
    assert.ok(result.escalation_probability <= 1);
    assert.strictEqual(result.components.risk_trend, 0);
    assert.strictEqual(result.components.congestion_trend, 0);
  });

  it("applies CRITICAL drift weight of 0.6", () => {
    const input: EscalationInput = { ...baseInput, drift_status: "CRITICAL" };
    const result = computeEscalation(input);
    assert.strictEqual(result.components.drift_weight, 0.6);
  });

  it("applies WARNING drift weight of 0.3", () => {
    const input: EscalationInput = { ...baseInput, drift_status: "WARNING" };
    const result = computeEscalation(input);
    assert.strictEqual(result.components.drift_weight, 0.3);
  });

  it("applies NORMAL drift weight of 0.0", () => {
    const result = computeEscalation(baseInput);
    assert.strictEqual(result.components.drift_weight, 0.0);
  });

  it("CRITICAL drift produces higher escalation than NORMAL", () => {
    const normal = computeEscalation(baseInput);
    const critical = computeEscalation({ ...baseInput, drift_status: "CRITICAL" });
    assert.ok(critical.escalation_probability >= normal.escalation_probability);
  });

  it("handles forecast without confidence scores", () => {
    const input: EscalationInput = {
      ...baseInput,
      forecast: baseInput.forecast.map(({ confidence_score: _, ...rest }) => rest),
    };
    const result = computeEscalation(input);
    assert.ok(result.escalation_probability >= 0);
    assert.ok(result.escalation_probability <= 1);
    assert.strictEqual(result.components.confidence_factor, 1.0);
  });
});
