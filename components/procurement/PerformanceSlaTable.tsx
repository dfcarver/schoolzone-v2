"use client";

import { PerformanceData } from "@/lib/types";

interface PerformanceSlaTableProps {
  data: PerformanceData;
}

export default function PerformanceSlaTable({ data }: PerformanceSlaTableProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">ID</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Metric</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Target</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Current</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Unit</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 align-top">
                <td className="py-3 px-4 font-mono text-[10px] text-gray-400 dark:text-gray-500">{m.id}</td>
                <td className="py-3 px-4 text-xs font-medium text-gray-900 dark:text-gray-100">{m.metric}</td>
                <td className="py-3 px-4 text-xs font-mono text-gray-700 dark:text-gray-300">{m.target}</td>
                <td className="py-3 px-4 text-xs font-mono text-emerald-700 font-semibold">{m.current}</td>
                <td className="py-3 px-4 text-[10px] text-gray-400">{m.unit}</td>
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{m.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.disclaimers.length > 0 && (
        <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Disclaimers</h4>
          <div className="space-y-2">
            {data.disclaimers.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-amber-500 shrink-0 mt-0.5">&bull;</span>
                <p className="text-xs text-gray-600 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
