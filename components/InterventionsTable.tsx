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
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Active Interventions
        </h3>
        <p className="text-sm text-gray-400">No active interventions</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Active Interventions
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                ID
              </th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Action
              </th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Applied At
              </th>
              <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {interventions.map((intervention) => (
              <tr
                key={intervention.id}
                className="border-b border-gray-50 last:border-0"
              >
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
                  {intervention.id}
                </td>
                <td className="py-2.5 pr-4 text-gray-900">
                  {intervention.action}
                </td>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500">
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
