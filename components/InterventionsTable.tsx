"use client";

import { Intervention, InterventionStatus } from "@/lib/types";

const STATUS_BADGE: Record<InterventionStatus, string> = {
  active: "bg-green-100 text-green-700",
  en_route: "bg-blue-100 text-blue-700",
  pending: "bg-gray-100 text-gray-600",
  completed: "bg-gray-100 text-gray-500",
};

interface InterventionsTableProps {
  interventions: Intervention[];
}

export default function InterventionsTable({
  interventions,
}: InterventionsTableProps) {
  if (!interventions || interventions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Active Interventions
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">No active interventions</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Active Interventions
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                ID
              </th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Action
              </th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Applied At
              </th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {interventions.map((intervention) => (
              <tr
                key={intervention.id}
                className="border-b border-gray-50 dark:border-gray-800 last:border-0"
              >
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                  {intervention.id}
                </td>
                <td className="py-2.5 pr-4 text-gray-900 dark:text-gray-100">
                  {intervention.action}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                  {intervention.applied_at}
                </td>
                <td className="py-2.5">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_BADGE[intervention.status] ||
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {intervention.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
