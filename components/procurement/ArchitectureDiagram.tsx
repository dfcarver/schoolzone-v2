"use client";

import { ArchitectureData } from "@/lib/types";
import PillBadge from "./PillBadge";
import CalloutPanel from "./CalloutPanel";

interface ArchitectureDiagramProps {
  data: ArchitectureData;
}

export default function ArchitectureDiagram({ data }: ArchitectureDiagramProps) {
  return (
    <div className="space-y-6">
      {/* Layered Architecture */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Deployment Topology</h3>
        <div className="space-y-0">
          {data.layers.map((layer, i) => (
            <div key={layer.id} className="relative">
              {i > 0 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
                </div>
              )}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{layer.id}</span>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{layer.name}</h4>
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{layer.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {layer.components.map((comp) => (
                    <span key={comp} className="text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Principles */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Architecture Principles</h3>
        <div className="space-y-3">
          {data.principles.map((p) => (
            <div key={p.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
              <PillBadge label={p.id} variant="default" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Boundary */}
      <CalloutPanel title={data.contractBoundary.title} variant="emerald">
        <p className="mb-3">{data.contractBoundary.description}</p>
        <div className="space-y-1.5">
          {data.contractBoundary.schemas.map((schema) => (
            <div key={schema} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-emerald-600 shrink-0 mt-0.5">&bull;</span>
              <span className="font-mono text-[11px]">{schema}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-wider">Reference: {data.contractBoundary.reference}</p>
      </CalloutPanel>
    </div>
  );
}
