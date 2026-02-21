import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { computeAnomaly } from "../lib/engines/anomaly";
import { AnomalyInput } from "../lib/engines/types";

describe("computeAnomaly", () => {
  const baseInput: AnomalyInput = {
    actual_vehicle_count: 120,
    forecast_vehicle_count: 100,
    current_speed_samples: [25, 28, 30, 32, 27],
    actual_risk: 0.6,
    forecast_upper_bound: 0.65,
  };

  it("returns deterministic output for identical input", () => {
    const a = computeAnomaly(baseInput);
    const b = computeAnomaly(baseInput);
    assert.deepStrictEqual(a, b);
  });

  it("produces anomaly_score in [0, 1]", () => {
    const result = computeAnomaly(baseInput);
    assert.ok(result.anomaly_score >= 0);
    assert.ok(result.anomaly_score <= 1);
  });

  it("produces no NaN values", () => {
    const result = computeAnomaly(baseInput);
    assert.ok(!Number.isNaN(result.anomaly_score));
  });

  it("classifies low anomaly as ADVISORY", () => {
    const input: AnomalyInput = {
      actual_vehicle_count: 100,
      forecast_vehicle_count: 100,
      current_speed_samples: [30, 30, 30, 30, 30],
      actual_risk: 0.3,
      forecast_upper_bound: 0.5,
    };
    const result = computeAnomaly(input);
    assert.strictEqual(result.classification, "ADVISORY");
  });

  it("classifies high anomaly with band violation as higher severity", () => {
    const input: AnomalyInput = {
      actual_vehicle_count: 200,
      forecast_vehicle_count: 50,
      current_speed_samples: [5, 45, 10, 50, 8],
      actual_risk: 0.9,
      forecast_upper_bound: 0.5,
    };
    const result = computeAnomaly(input);
    assert.ok(result.anomaly_score > 0.3);
    assert.ok(["SIGNIFICANT", "CRITICAL"].includes(result.classification));
  });

  it("band violation increases anomaly score", () => {
    const noViolation = computeAnomaly({ ...baseInput, actual_risk: 0.5, forecast_upper_bound: 0.7 });
    const withViolation = computeAnomaly({ ...baseInput, actual_risk: 0.8, forecast_upper_bound: 0.7 });
    assert.ok(withViolation.anomaly_score > noViolation.anomaly_score);
  });

  it("handles empty speed samples", () => {
    const input: AnomalyInput = { ...baseInput, current_speed_samples: [] };
    const result = computeAnomaly(input);
    assert.ok(result.anomaly_score >= 0);
    assert.ok(result.anomaly_score <= 1);
    assert.ok(!Number.isNaN(result.anomaly_score));
  });

  it("handles identical actual and forecast vehicle counts", () => {
    const input: AnomalyInput = { ...baseInput, actual_vehicle_count: 100, forecast_vehicle_count: 100 };
    const result = computeAnomaly(input);
    assert.ok(result.anomaly_score >= 0);
  });
});
