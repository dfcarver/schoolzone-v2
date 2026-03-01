"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ZoneLiveState, ForecastPoint } from "@/lib/types";
import { PredictRequest, PredictResponse } from "@/lib/ai/predictTypes";
import ForecastChart from "@/components/ForecastChart";

interface AIPredictionPanelProps {
  zone: ZoneLiveState;
}

const TREND_ICON: Record<PredictResponse["trend"], string> = {
  falling: "↘",
  stable: "→",
  rising: "↗",
};

const TREND_COLOR: Record<PredictResponse["trend"], string> = {
  falling: "text-emerald-600 dark:text-emerald-400",
  stable: "text-amber-600 dark:text-amber-400",
  rising: "text-red-600 dark:text-red-400",
};

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: PredictResponse; predicted: ForecastPoint[] }
  | { status: "error"; message: string };

export default function AIPredictionPanel({ zone }: AIPredictionPanelProps) {
  const [state, setState] = useState<PanelState>({ status: "idle" });
  const hasRunRef = useRef(false);
  const prevInterventionCountRef = useRef(-1);

  const runPrediction = useCallback(async (z: ZoneLiveState) => {
    hasRunRef.current = true;
    setState({ status: "loading" });

    const demoInterventions = z.interventions
      .filter((i) => i.id.startsWith("demo-int-"))
      .map((i) => i.action);

    const body: PredictRequest = {
      zone_id: z.zone_id,
      zone_name: z.name,
      risk_score: z.risk_score,
      risk_level: z.risk_level,
      speed_avg_mph: z.speed_avg_mph,
      pedestrian_count: z.pedestrian_count,
      vehicle_count: z.vehicle_count,
      baseline_forecast: z.forecast_30m,
      active_interventions: demoInterventions,
    };

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setState({ status: "error", message: err.error ?? `HTTP ${res.status}` });
        return;
      }

      const data = (await res.json()) as PredictResponse;

      const predicted: ForecastPoint[] = data.predicted_forecast.map((p, i) => ({
        time: z.forecast_30m[i]?.time ?? `+${p.horizon_minutes}m`,
        risk: Math.min(1, Math.max(0, p.predicted_risk)),
        confidence: Math.min(1, Math.max(0, p.confidence)),
      }));

      setState({ status: "success", data, predicted });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }, []);

  // Auto-refresh only after the first manual run, when intervention count changes
  useEffect(() => {
    if (!hasRunRef.current) return;
    const count = zone.interventions.filter((i) => i.id.startsWith("demo-int-")).length;
    if (count !== prevInterventionCountRef.current) {
      prevInterventionCountRef.current = count;
      runPrediction(zone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone.interventions.length]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">AI Risk Prediction</h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            30-min forecast adjusted for active interventions
          </p>
        </div>
        <button
          onClick={() => runPrediction(zone)}
          disabled={state.status === "loading"}
          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.status === "loading"
            ? "Predicting…"
            : state.status === "idle"
            ? "Run Prediction"
            : "Re-predict"}
        </button>
      </div>

      {state.status === "idle" && (
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Run a prediction to see how active interventions are projected to affect the 30-minute risk trajectory.
        </p>
      )}

      {state.status === "loading" && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
          <div className="h-56 bg-gray-50 dark:bg-gray-800 rounded" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/6" />
        </div>
      )}

      {state.status === "error" && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">Prediction failed</p>
          <p className="text-xs text-red-500 mt-1">{state.message}</p>
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${TREND_COLOR[state.data.trend]}`}>
              {TREND_ICON[state.data.trend]}
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {state.data.headline}
            </p>
          </div>

          <ForecastChart
            data={zone.forecast_30m}
            predicted={state.predicted}
            title="Baseline vs AI-Predicted Risk"
          />

          {state.data.intervention_impact && (
            <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                Intervention Impact
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {state.data.intervention_impact}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
