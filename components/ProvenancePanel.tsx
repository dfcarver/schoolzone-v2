"use client";

import { Incident } from "@/lib/types";

interface ProvenancePanelProps {
  incident: Incident;
}

export default function ProvenancePanel({ incident }: ProvenancePanelProps) {
  const md = incident.model_metadata;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Model Provenance</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <span className="text-xs text-gray-400 block">Model</span>
          <span className="text-sm text-gray-900 font-medium">{md.model_name}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Version</span>
          <span className="text-sm text-gray-900 font-medium">{md.model_version}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Confidence</span>
          <span className="text-sm text-gray-900 font-medium">{(md.prediction_confidence * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Inference Latency</span>
          <span className="text-sm text-gray-900 font-medium">{md.inference_latency_ms}ms</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Training Data</span>
          <span className="text-sm text-gray-900 font-medium">{md.training_data_range}</span>
        </div>
        <div>
          <span className="text-xs text-gray-400 block">Features Used</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {md.features_used.map((f) => (
              <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
