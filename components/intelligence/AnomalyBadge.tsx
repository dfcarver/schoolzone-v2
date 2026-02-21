"use client";

import { useState } from "react";
import { AnomalyOutput } from "@/lib/engines/types";

interface AnomalyBadgeProps {
  output: AnomalyOutput;
  densityDeviation?: number;
  speedVariance?: number;
  bandViolation?: boolean;
}

const CLASSIFICATION_STYLE: Record<string, { bg: string; text: string }> = {
  ADVISORY: { bg: "bg-blue-100", text: "text-blue-700" },
  SIGNIFICANT: { bg: "bg-amber-100", text: "text-amber-700" },
  CRITICAL: { bg: "bg-red-100", text: "text-red-700" },
};

export default function AnomalyBadge({ output, densityDeviation, speedVariance, bandViolation }: AnomalyBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const style = CLASSIFICATION_STYLE[output.classification] ?? CLASSIFICATION_STYLE.ADVISORY;
  const pct = Math.round(output.anomaly_score * 100);

  return (
    <div className="relative inline-flex items-center gap-2">
      <span
        className={`text-xs font-medium px-2.5 py-1 rounded-full cursor-help ${style.bg} ${style.text}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {output.classification} ({pct}%)
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <p className="text-[11px] font-semibold text-gray-700 mb-2">Anomaly Factors</p>
          <div className="space-y-1 text-[10px] text-gray-500">
            {densityDeviation != null && (
              <div className="flex justify-between">
                <span>Density Deviation</span>
                <span className="font-mono">{densityDeviation.toFixed(2)}</span>
              </div>
            )}
            {speedVariance != null && (
              <div className="flex justify-between">
                <span>Speed Variance</span>
                <span className="font-mono">{speedVariance.toFixed(2)}</span>
              </div>
            )}
            {bandViolation != null && (
              <div className="flex justify-between">
                <span>Band Violation</span>
                <span className="font-mono">{bandViolation ? "Yes" : "No"}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-gray-100 font-medium text-gray-700">
              <span>Anomaly Score</span>
              <span className="font-mono">{output.anomaly_score.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
