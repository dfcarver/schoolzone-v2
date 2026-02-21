"use client";

import { Recommendation } from "@/lib/types";

const PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MED: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  onApply?: (id: string) => void;
}

export default function RecommendationCard({
  recommendation,
  onApply,
}: RecommendationCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
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
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            {recommendation.action}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{recommendation.impact}</p>
        </div>
        {onApply && (
          <button
            onClick={() => onApply(recommendation.id)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
          >
            Apply (Demo)
          </button>
        )}
      </div>
    </div>
  );
}
