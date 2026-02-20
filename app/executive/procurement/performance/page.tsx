"use client";

import { useState, useEffect } from "react";
import { PerformanceData } from "@/lib/types";
import { loadProcurementData } from "@/lib/data";
import { exportProcurementJSON } from "@/lib/export";
import { useLiveState } from "@/lib/useLiveState";
import Topbar from "@/components/Topbar";
import SectionHeader from "@/components/procurement/SectionHeader";
import PerformanceSlaTable from "@/components/procurement/PerformanceSlaTable";
import SystemHealthPanel from "@/components/SystemHealthPanel";
import EvidenceLinksPanel from "@/components/procurement/EvidenceLinksPanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

export default function PerformancePage() {
  const { liveState } = useLiveState();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProcurementData<PerformanceData>("performance.json").then((result) => {
      if (cancelled) return;
      setData(result.data);
      setError(result.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState message={error ?? "Data unavailable"} backHref="/executive" backLabel="Back to Executive" />;

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Procurement — Performance & SLA" />
      <div className="flex-1 overflow-y-auto p-6">
        <SectionHeader title={data.title} subtitle={data.subtitle} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <PerformanceSlaTable data={data} />
            {liveState && <SystemHealthPanel liveState={liveState} />}
          </div>
          <div className="space-y-6">
            <EvidenceLinksPanel />
            <div className="flex justify-end">
              <button
                onClick={() => exportProcurementJSON(data, "performance")}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
