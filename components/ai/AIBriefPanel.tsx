"use client";

import { useState, useCallback } from "react";
import { AIBriefRequest, AIBriefResponse } from "@/lib/ai/types";

interface AIBriefPanelProps {
  request: AIBriefRequest;
}

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: AIBriefResponse; correlationId: string }
  | { status: "error"; message: string };

export default function AIBriefPanel({ request }: AIBriefPanelProps) {
  const [state, setState] = useState<PanelState>({ status: "idle" });

  const generateBrief = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const correlationId = res.headers.get("X-Correlation-Id") ?? "";

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setState({ status: "error", message: err.error ?? `HTTP ${res.status}` });
        return;
      }

      const data = (await res.json()) as AIBriefResponse;
      setState({ status: "success", data, correlationId });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : "Network error" });
    }
  }, [request]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">AI Operational Brief</h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {request.corridor_name} — {request.drift_status} drift status
          </p>
        </div>
        <button
          onClick={generateBrief}
          disabled={state.status === "loading"}
          className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {state.status === "loading" ? "Generating…" : state.status === "success" ? "Regenerate" : "Generate Brief"}
        </button>
      </div>

      {state.status === "idle" && (
        <p className="text-sm text-gray-400">
          Select &ldquo;Generate Brief&rdquo; to produce an AI-powered operational assessment for this corridor.
        </p>
      )}

      {state.status === "loading" && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/6" />
          <div className="h-3 bg-gray-50 rounded w-3/6 mt-4" />
        </div>
      )}

      {state.status === "error" && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <p className="text-sm font-medium text-red-700">Brief generation failed</p>
          <p className="text-xs text-red-500 mt-1">{state.message}</p>
        </div>
      )}

      {state.status === "success" && (
        <div className="space-y-5">
          {/* Executive Summary */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Executive Summary</p>
            <p className="text-sm text-gray-700 leading-relaxed">{state.data.executive_summary}</p>
          </div>

          {/* Drivers */}
          {state.data.drivers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Key Drivers</p>
              <div className="space-y-2">
                {state.data.drivers.map((d, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-900">{d.label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{d.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommendation</p>
            <p className="text-sm font-medium text-gray-900">{state.data.recommendation.action}</p>
            <p className="text-xs text-gray-600 mt-1">{state.data.recommendation.rationale}</p>
            <p className="text-xs text-emerald-700 mt-1.5">Expected impact: {state.data.recommendation.expected_impact}</p>
          </div>

          {/* Caveats */}
          {state.data.caveats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Caveats</p>
              <div className="space-y-1">
                {state.data.caveats.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 shrink-0 mt-0.5 text-xs">&bull;</span>
                    <p className="text-xs text-gray-500">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: Confidence + Correlation ID */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-[10px] text-gray-400">
              Confidence: {(state.data.confidence * 100).toFixed(0)}%
            </span>
            {state.correlationId && (
              <span className="text-[10px] font-mono text-gray-300">
                {state.correlationId}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
