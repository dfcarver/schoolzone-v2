"use client";

import { useState } from "react";
import {
  DispatchedIntervention,
  DispatchStatus,
  INTERVENTION_OPTIONS,
} from "@/lib/mapFeatures";
import FeatureHint from "./FeatureHint";

interface InterventionDispatchProps {
  interventions: DispatchedIntervention[];
  selectedCorridor: { id: string; name: string; congestion: number } | null;
  onDispatch: (corridorId: string, corridorName: string, type: DispatchedIntervention["type"], description: string) => void;
  onUpdateStatus: (id: string, status: DispatchStatus) => void;
  onDismiss: () => void;
}

function statusBadge(status: DispatchStatus) {
  const config: Record<DispatchStatus, { bg: string; text: string; label: string }> = {
    dispatched: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", label: "Dispatched" },
    en_route: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", label: "En Route" },
    on_scene: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", label: "On Scene" },
    completed: { bg: "bg-gray-50 dark:bg-gray-800", text: "text-gray-500 dark:text-gray-400", label: "Completed" },
  };
  const c = config[status];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

const NEXT_STATUS: Record<DispatchStatus, DispatchStatus | null> = {
  dispatched: "en_route",
  en_route: "on_scene",
  on_scene: "completed",
  completed: null,
};

export default function InterventionDispatch({
  interventions,
  selectedCorridor,
  onDispatch,
  onUpdateStatus,
  onDismiss,
}: InterventionDispatchProps) {
  const [showDispatchMenu, setShowDispatchMenu] = useState(false);

  const activeInterventions = interventions.filter((i) => i.status !== "completed");
  const completedInterventions = interventions.filter((i) => i.status === "completed");

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Intervention Dispatch
        {activeInterventions.length > 0 && (
          <span className="ml-2 text-[10px] font-normal text-emerald-600">
            {activeInterventions.length} active
          </span>
        )}
      </h4>

      <FeatureHint>
        Click any corridor line or school card on the map to select it, then hit Deploy to choose an intervention. Track progress through Dispatched → En Route → On Scene → Completed using the advance button.
      </FeatureHint>

      {/* Dispatch trigger for selected corridor */}
      {selectedCorridor && (
        <div className="mb-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[11px] font-medium text-blue-900 dark:text-blue-100">
                {selectedCorridor.name}
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400">
                Congestion: {Math.round(selectedCorridor.congestion * 100)}%
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowDispatchMenu((v) => !v)}
                className="text-[10px] px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showDispatchMenu ? "Cancel" : "Deploy"}
              </button>
              <button
                onClick={onDismiss}
                className="text-[10px] px-2 py-1 text-blue-500 hover:text-blue-700 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {showDispatchMenu && (
            <div className="space-y-1.5">
              {INTERVENTION_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => {
                    onDispatch(selectedCorridor.id, selectedCorridor.name, opt.type, opt.label);
                    setShowDispatchMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors text-left"
                >
                  <span className="text-base">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200">{opt.label}</p>
                    <p className="text-[9px] text-gray-400">ETA: {opt.eta}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedCorridor && activeInterventions.length === 0 && completedInterventions.length === 0 && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Click a corridor on the map to deploy an intervention.
        </p>
      )}

      {/* Active interventions */}
      {activeInterventions.length > 0 && (
        <div className="space-y-2">
          {activeInterventions.map((intv) => {
            const nextStatus = NEXT_STATUS[intv.status];
            return (
              <div
                key={intv.id}
                className="border border-gray-100 dark:border-gray-700 rounded-lg p-2.5 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">
                    {intv.description}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-0.5">
                    {intv.corridorName} · {new Date(intv.dispatchedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {statusBadge(intv.status)}
                  {nextStatus && (
                    <button
                      onClick={() => onUpdateStatus(intv.id, nextStatus)}
                      className="text-[9px] px-1.5 py-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded transition-colors"
                    >
                      → {nextStatus.replace("_", " ")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed (collapsed) */}
      {completedInterventions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
            {completedInterventions.length} completed
          </p>
          {completedInterventions.slice(0, 3).map((intv) => (
            <div key={intv.id} className="flex items-center justify-between py-1 text-[10px] text-gray-400">
              <span className="truncate">{intv.description} — {intv.corridorName}</span>
              {statusBadge(intv.status)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
