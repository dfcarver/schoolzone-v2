"use client";

import { SecurityData } from "@/lib/types";
import PillBadge from "./PillBadge";

interface ControlChecklistProps {
  data: SecurityData;
}

export default function ControlChecklist({ data }: ControlChecklistProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">ID</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Domain</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Control Statement</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Mechanism</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-44">Evidence</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.controls.map((ctrl) => (
              <tr key={ctrl.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 align-top">
                <td className="py-3 px-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{ctrl.id}</td>
                <td className="py-3 px-4 text-xs font-medium text-gray-900 dark:text-gray-100">{ctrl.domain}</td>
                <td className="py-3 px-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{ctrl.statement}</td>
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{ctrl.mechanism}</td>
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{ctrl.evidence}</td>
                <td className="py-3 px-4">
                  <PillBadge label={ctrl.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.statements.length > 0 && (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Compliance Statements</h4>
          <div className="space-y-2">
            {data.statements.map((stmt, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-emerald-600 shrink-0 mt-0.5">&bull;</span>
                <p className="text-sm text-gray-700">{stmt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
