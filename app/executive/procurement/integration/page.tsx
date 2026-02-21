"use client";

import { useState, useEffect } from "react";
import { IntegrationData } from "@/lib/types";
import { loadProcurementData } from "@/lib/data";
import { exportProcurementJSON } from "@/lib/export";
import Topbar from "@/components/Topbar";
import SectionHeader from "@/components/procurement/SectionHeader";
import IntegrationReadiness from "@/components/procurement/IntegrationReadiness";
import EvidenceLinksPanel from "@/components/procurement/EvidenceLinksPanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

export default function IntegrationPage() {
  const [data, setData] = useState<IntegrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProcurementData<IntegrationData>("integration.json").then((result) => {
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
      <Topbar title="Procurement — Integration & Interoperability" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <SectionHeader title={data.title} subtitle={data.subtitle} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <IntegrationReadiness data={data} />
          </div>
          <div className="space-y-6">
            <EvidenceLinksPanel />
            <div className="flex justify-end">
              <button
                onClick={() => exportProcurementJSON(data, "integration")}
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
