"use client";

import { Recommendation, RiskLevel } from "@/lib/types";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MED: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

const ETA_LABEL: Record<RiskLevel, string> = {
  [RiskLevel.HIGH]: "~5–10 min",
  [RiskLevel.MED]: "~10–20 min",
  [RiskLevel.LOW]: "~20–30 min",
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply?: (id: string) => void;
  applied?: boolean;
}

export default function RecommendationCard({
  recommendation,
  onApply,
  applied = false,
}: RecommendationCardProps) {
  const eta = ETA_LABEL[recommendation.priority as RiskLevel];

  return (
    <div
      className={`bg-white dark:bg-gray-900 border rounded-lg p-4 transition-colors ${
        applied
          ? "border-l-4 border-l-green-500 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20"
          : "border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[recommendation.priority]}`}
            >
              {recommendation.priority}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Confidence: {(recommendation.confidence * 100).toFixed(0)}%
            </span>
            {applied && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                </svg>
                Applied
              </span>
            )}
          </div>
          <p className={`text-sm font-medium mb-1 ${applied ? "text-gray-500 dark:text-gray-400" : "text-gray-900 dark:text-gray-100"}`}>
            {recommendation.action}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{recommendation.impact}</p>
          {eta && (
            <p className={`text-xs mt-1.5 ${applied ? "text-green-700 dark:text-green-400 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
              {applied ? `Expected improvement in ${eta}` : `Est. impact in ${eta}`}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {applied ? (
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
              Dispatched
            </span>
          ) : onApply ? (
            <button
              onClick={() => onApply(recommendation.id)}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            >
              Apply (Demo)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
