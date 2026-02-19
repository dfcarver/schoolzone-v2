"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Incident, IncidentStatus } from "@/lib/types";
import { loadIncidents } from "@/lib/data";
import Topbar from "@/components/Topbar";
import IncidentTimeline from "@/components/IncidentTimeline";

const SEVERITY_BADGE: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MED: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<IncidentStatus, string> = {
  investigating: "bg-red-50 text-red-600",
  monitoring: "bg-amber-50 text-amber-600",
  resolved: "bg-green-50 text-green-600",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mon = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}, ${year} ${h}:${m} UTC`;
}

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentId = params.incidentId as string;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents()
      .then((data) => {
        const found = data.find((i) => i.incident_id === incidentId);
        if (found) {
          setIncident(found);
        } else {
          setError(`Incident "${incidentId}" not found`);
        }
      })
      .catch(() => {
        setError("Demo Data Unavailable");
      })
      .finally(() => setLoading(false));
  }, [incidentId]);

  const handleDownload = useCallback(() => {
    if (!incident) return;
    const json = JSON.stringify(incident, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${incident.incident_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [incident]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-sm text-gray-400">Loading incident...</div>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-2">
            {error ?? "Demo Data Unavailable"}
          </p>
          <Link
            href="/incidents"
            className="text-sm text-blue-600 hover:underline"
          >
            Back to Incidents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/incidents"
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Incidents
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">
            {incident.incident_id}
          </span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">
                {incident.title}
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400">
                  {incident.incident_id}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    SEVERITY_BADGE[incident.severity] || ""
                  }`}
                >
                  {incident.severity}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    STATUS_BADGE[incident.status] ||
                    "bg-gray-100 text-gray-600"
                  }`}
                >
                  {incident.status}
                </span>
                <span className="text-xs text-gray-400">
                  {incident.zone_name}
                </span>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Download JSON
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            {incident.summary}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            <span>
              Type: <span className="text-gray-600">{incident.type}</span>
            </span>
            <span>
              Reported:{" "}
              <span className="text-gray-600">
                {formatDateTime(incident.reported_at)}
              </span>
            </span>
          </div>
        </div>

        <IncidentTimeline events={incident.events} />

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Model Metadata
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-gray-400 block">Model</span>
              <span className="text-sm text-gray-900 font-medium">
                {incident.model_metadata.model_name}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Version</span>
              <span className="text-sm text-gray-900 font-medium">
                {incident.model_metadata.model_version}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Confidence</span>
              <span className="text-sm text-gray-900 font-medium">
                {(incident.model_metadata.prediction_confidence * 100).toFixed(
                  0
                )}
                %
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">
                Inference Latency
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {incident.model_metadata.inference_latency_ms}ms
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">
                Training Data
              </span>
              <span className="text-sm text-gray-900 font-medium">
                {incident.model_metadata.training_data_range}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">
                Features Used
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {incident.model_metadata.features_used.map((f) => (
                  <span
                    key={f}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
