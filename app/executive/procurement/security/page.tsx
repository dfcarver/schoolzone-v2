"use client";

import { useState, useEffect } from "react";
import { SecurityData } from "@/lib/types";
import { loadProcurementData } from "@/lib/data";
import { exportProcurementJSON } from "@/lib/export";
import Topbar from "@/components/Topbar";
import SectionHeader from "@/components/procurement/SectionHeader";
import ControlChecklist from "@/components/procurement/ControlChecklist";
import EvidenceLinksPanel from "@/components/procurement/EvidenceLinksPanel";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProcurementData<SecurityData>("security.json").then((result) => {
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
      <Topbar title="Procurement — Security & Compliance" />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <SectionHeader title={data.title} subtitle={data.subtitle} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ControlChecklist data={data} />
          </div>
          <div className="space-y-6">
            <EvidenceLinksPanel />
            <div className="flex justify-end">
              <button
                onClick={() => exportProcurementJSON(data, "security")}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
