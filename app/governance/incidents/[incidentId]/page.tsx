"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Incident, IncidentStatus } from "@/lib/types";
import { loadIncidents } from "@/lib/data";
import { useDemoConfig } from "@/lib/demoConfig";
import { exportIncidentJSON } from "@/lib/export";
import Topbar from "@/components/Topbar";
import IncidentTimeline from "@/components/IncidentTimeline";
import ProvenancePanel from "@/components/ProvenancePanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

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

export default function GovernanceIncidentDetailPage() {
  const params = useParams();
  const incidentId = params.incidentId as string;
  const { config } = useDemoConfig();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadIncidents(config.scenario).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else {
        const found = result.data.find((i) => i.incident_id === incidentId);
        if (found) {
          setIncident(found);
        } else {
          setError(`Incident "${incidentId}" not found`);
        }
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [incidentId, config.scenario]);

  if (loading) return <PageSkeleton />;
  if (error || !incident) {
    return <ErrorState message={error ?? "Demo Data Unavailable"} backHref="/governance/incidents" backLabel="Back to Incidents" />;
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Incident Detail" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/governance/incidents" className="text-sm text-gray-400 hover:text-gray-600">Incidents</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-900 font-medium">{incident.incident_id}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">{incident.title}</h1>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400">{incident.incident_id}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[incident.severity] || ""}`}>{incident.severity}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[incident.status] || "bg-gray-100 text-gray-600"}`}>{incident.status}</span>
                <span className="text-xs text-gray-400">{incident.zone_name}</span>
              </div>
            </div>
            <button
              onClick={() => exportIncidentJSON(incident)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Export JSON
            </button>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{incident.summary}</p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            <span>Type: <span className="text-gray-600">{incident.type}</span></span>
            <span>Reported: <span className="text-gray-600">{formatDateTime(incident.reported_at)}</span></span>
          </div>
        </div>

        <IncidentTimeline events={incident.events} />

        <ProvenancePanel incident={incident} />
      </div>
    </div>
  );
}
