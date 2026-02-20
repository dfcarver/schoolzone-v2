"use client";

import { IntegrationData } from "@/lib/types";
import PillBadge from "./PillBadge";
import CalloutPanel from "./CalloutPanel";

interface IntegrationReadinessProps {
  data: IntegrationData;
}

export default function IntegrationReadiness({ data }: IntegrationReadinessProps) {
  return (
    <div className="space-y-6">
      {/* Integration Checklist Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-12">ID</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">System</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Description</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-40">Contract Type</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.integrations.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0 align-top">
                <td className="py-3 px-4 font-mono text-[10px] text-gray-400">{item.id}</td>
                <td className="py-3 px-4 text-xs font-medium text-gray-900">{item.system}</td>
                <td className="py-3 px-4 text-xs text-gray-600 leading-relaxed">{item.description}</td>
                <td className="py-3 px-4 text-[11px] font-mono text-gray-500">{item.contractType}</td>
                <td className="py-3 px-4">
                  <PillBadge label={item.status} />
                </td>
                <td className="py-3 px-4 text-xs text-gray-500 leading-relaxed">{item.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Integration Boundary */}
      <CalloutPanel title={data.boundary.title} variant="emerald">
        <p className="mb-3">{data.boundary.description}</p>
        <div className="space-y-1.5">
          {data.boundary.principles.map((p, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-emerald-600 shrink-0 mt-0.5">&bull;</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </CalloutPanel>
    </div>
  );
}
