"use client";

import { RiskMatrixData } from "@/lib/types";
import PillBadge from "./PillBadge";

interface RiskMatrixTableProps {
  data: RiskMatrixData;
}

const IMPACT_STYLE: Record<string, string> = {
  Critical: "text-red-700 font-semibold",
  High: "text-red-600",
  Medium: "text-amber-600",
  Low: "text-gray-600",
};

const LIKELIHOOD_STYLE: Record<string, string> = {
  High: "text-red-600",
  Medium: "text-amber-600",
  Low: "text-gray-600",
};

export default function RiskMatrixTable({ data }: RiskMatrixTableProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">ID</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Impact</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">Likelihood</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mitigation Strategy</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Owner</th>
            <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.risks.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 align-top">
              <td className="py-3 px-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{r.id}</td>
              <td className="py-3 px-4 text-xs font-medium text-gray-900 dark:text-gray-100">{r.risk}</td>
              <td className={`py-3 px-4 text-xs ${IMPACT_STYLE[r.impact] ?? "text-gray-600"}`}>{r.impact}</td>
              <td className={`py-3 px-4 text-xs ${LIKELIHOOD_STYLE[r.likelihood] ?? "text-gray-600"}`}>{r.likelihood}</td>
              <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{r.mitigation}</td>
              <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">{r.owner}</td>
              <td className="py-3 px-4">
                <PillBadge label={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
