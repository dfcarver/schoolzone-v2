"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Incident, IncidentStatus } from "@/lib/types";
import { loadIncidents } from "@/lib/data";
import { useDemoConfig } from "@/lib/demoConfig";
import Topbar from "@/components/Topbar";
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

function formatReportedAt(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mon = months[d.getUTCMonth()];
  const day = d.getUTCDate();
  const h = String(d.getUTCHours()).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${mon} ${day}, ${h}:${m}`;
}

export default function GovernanceIncidentsPage() {
  const router = useRouter();
  const { config } = useDemoConfig();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterZone, setFilterZone] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadIncidents(config.scenario).then((result) => {
      if (cancelled) return;
      setIncidents(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [config.scenario]);

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} />;

  const zones = Array.from(new Set(incidents.map((i) => i.zone_name)));

  const filtered = incidents.filter((inc) => {
    if (filterZone && inc.zone_name !== filterZone) return false;
    if (filterSeverity && inc.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Governance — Incidents" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Incidents</h1>
          <div className="flex items-center gap-3">
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            >
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800"
            >
              <option value="">All Severities</option>
              <option value="LOW">LOW</option>
              <option value="MED">MED</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Zone</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Severity</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reported</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">No incidents match the current filters</td>
                </tr>
              ) : (
                filtered.map((inc) => (
                  <tr
                    key={inc.incident_id}
                    onClick={() => router.push(`/governance/incidents/${inc.incident_id}`)}
                    className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-gray-500 dark:text-gray-400">{inc.incident_id}</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-gray-100 font-medium max-w-xs truncate">{inc.title}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{inc.zone_name}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[inc.severity] || ""}`}>{inc.severity}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[inc.status] || "bg-gray-100 text-gray-600"}`}>{inc.status}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500 dark:text-gray-400">{formatReportedAt(inc.reported_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
