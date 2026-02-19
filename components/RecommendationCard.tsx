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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[recommendation.priority]}`}
            >
              {recommendation.priority}
            </span>
            <span className="text-xs text-gray-400">
              Confidence: {(recommendation.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {recommendation.action}
          </p>
          <p className="text-xs text-gray-500">{recommendation.impact}</p>
        </div>
        {onApply && (
          <button
            onClick={() => onApply(recommendation.id)}
            className="shrink-0 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
          >
            Apply (Demo)
          </button>
        )}
      </div>
    </div>
  );
}
