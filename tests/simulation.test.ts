import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeSimulation } from "../lib/engines/simulation";
import { ForecastPoint } from "../lib/types";
import { SimulationInput } from "../lib/engines/types";

const baselineForecast: ForecastPoint[] = [
  { time: "08:05", risk: 0.55, confidence: 0.9 },
  { time: "08:10", risk: 0.60, confidence: 0.88 },
  { time: "08:15", risk: 0.65, confidence: 0.85 },
  { time: "08:20", risk: 0.68, confidence: 0.82 },
  { time: "08:25", risk: 0.70, confidence: 0.80 },
  { time: "08:30", risk: 0.72, confidence: 0.78 },
];

describe("computeSimulation", () => {
  const baseInput: SimulationInput = {
    baseline_forecast: baselineForecast,
    escalation_probability: 0.6,
    intervention_type: "SIGNAL_TIMING",
  };

  it("returns deterministic output for identical input", () => {
    const a = computeSimulation(baseInput);
    const b = computeSimulation(baseInput);
    assert.deepStrictEqual(a, b);
  });

  it("simulation never increases risk", () => {
    const result = computeSimulation(baseInput);
    for (let i = 0; i < baselineForecast.length; i++) {
      assert.ok(
        result.adjusted_forecast[i].risk <= baselineForecast[i].risk,
        `Adjusted risk at index ${i} exceeds baseline`
      );
    }
  });

  it("adjusted forecast has same length as baseline", () => {
    const result = computeSimulation(baseInput);
    assert.strictEqual(result.adjusted_forecast.length, baselineForecast.length);
  });

  it("risk_delta is negative or zero (reduction)", () => {
    const result = computeSimulation(baseInput);
    assert.ok(result.risk_delta <= 0, `risk_delta should be <= 0, got ${result.risk_delta}`);
  });

  it("adjusted_escalation_probability is in [0, 1]", () => {
    const result = computeSimulation(baseInput);
    assert.ok(result.adjusted_escalation_probability >= 0);
    assert.ok(result.adjusted_escalation_probability <= 1);
  });

  it("produces no NaN values", () => {
    const result = computeSimulation(baseInput);
    assert.ok(!Number.isNaN(result.risk_delta));
    assert.ok(!Number.isNaN(result.adjusted_escalation_probability));
    for (const fp of result.adjusted_forecast) {
      assert.ok(!Number.isNaN(fp.risk));
      assert.ok(!Number.isNaN(fp.confidence));
    }
  });

  it("TRAFFIC_DIVERSION has larger impact than ENFORCEMENT", () => {
    const diversion = computeSimulation({ ...baseInput, intervention_type: "TRAFFIC_DIVERSION" });
    const enforcement = computeSimulation({ ...baseInput, intervention_type: "ENFORCEMENT" });
    assert.ok(
      diversion.risk_delta <= enforcement.risk_delta,
      "Diversion should reduce risk more than enforcement"
    );
  });

  it("handles empty baseline forecast", () => {
    const input: SimulationInput = { ...baseInput, baseline_forecast: [] };
    const result = computeSimulation(input);
    assert.strictEqual(result.adjusted_forecast.length, 0);
    assert.strictEqual(result.risk_delta, 0);
    assert.ok(!Number.isNaN(result.adjusted_escalation_probability));
  });

  it("handles zero escalation probability with base 30% effect", () => {
    const input: SimulationInput = { ...baseInput, escalation_probability: 0 };
    const result = computeSimulation(input);
    // With 0 escalation, base 30% factor still applies — risk should decrease
    for (let i = 0; i < baselineForecast.length; i++) {
      assert.ok(
        result.adjusted_forecast[i].risk <= baselineForecast[i].risk,
        `Adjusted risk at index ${i} should not exceed baseline`
      );
    }
  });

  it("adjusted risk values are clamped to [0, 1]", () => {
    const result = computeSimulation({
      ...baseInput,
      escalation_probability: 1.0,
      intervention_type: "TRAFFIC_DIVERSION",
    });
    for (const fp of result.adjusted_forecast) {
      assert.ok(fp.risk >= 0);
      assert.ok(fp.risk <= 1);
    }
  });
});
