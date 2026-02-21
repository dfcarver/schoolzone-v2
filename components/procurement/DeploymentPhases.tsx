"use client";

import { DeploymentData } from "@/lib/types";
import PillBadge from "./PillBadge";

interface DeploymentPhasesProps {
  data: DeploymentData;
}

export default function DeploymentPhases({ data }: DeploymentPhasesProps) {
  return (
    <div className="space-y-6">
      {data.phases.map((phase, i) => (
        <div key={phase.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{phase.name}</h3>
                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{phase.id}</span>
              </div>
            </div>
            <PillBadge label={phase.status} />
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Scope</p>
            <p className="text-sm text-gray-700 dark:text-gray-300">{phase.scope}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Core Integrations</p>
              <div className="space-y-1.5">
                {phase.integrations.map((intg, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-gray-400 dark:text-gray-500 shrink-0">&bull;</span>
                    <span>{intg}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Training & SOPs</p>
              <div className="space-y-1.5">
                {phase.training.map((t, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-gray-400 dark:text-gray-500 shrink-0">&bull;</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Deliverables</p>
            <div className="space-y-2">
              {phase.deliverables.map((d) => (
                <div key={d.name} className="border border-gray-100 dark:border-gray-800 rounded p-3">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{d.name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{d.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Exit Criteria (Acceptance Gates)</p>
            <div className="space-y-1.5">
              {phase.exitCriteria.map((ec, j) => (
                <div key={j} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="text-emerald-600 shrink-0 mt-px">&#10003;</span>
                  <span>{ec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
