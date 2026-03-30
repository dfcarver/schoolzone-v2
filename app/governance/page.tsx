"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useLiveState } from "@/lib/useLiveState";
import { deriveDriftStatus, computeDistrictRollup, GovernanceStatus } from "@/lib/rollups";
import { getMetrics } from "@/lib/metrics";
import Topbar from "@/components/Topbar";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

const NAV_CARDS = [
  {
    href: "/governance/controls",
    title: "Controls & Compliance",
    description: "Model drift status, runtime validation, pipeline health, and compliance checklist",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    href: "/governance/incidents",
    title: "Incident Log",
    description: "Review all recorded incidents with zone and severity filters, response history",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
];

export default function GovernancePage() {
  const { liveState, loading, error, lastValidation } = useLiveState();

  const driftStatus = useMemo(
    () => (liveState ? deriveDriftStatus(liveState) : "NORMAL"),
    [liveState]
  );

  const rollup = useMemo(() => {
    if (!liveState) return null;
    return computeDistrictRollup(liveState, lastValidation, driftStatus);
  }, [liveState, lastValidation, driftStatus]);

  const metrics = getMetrics();

  if (loading) return <PageSkeleton />;
  if (error || !liveState) return <ErrorState message={error ?? "Demo Data Unavailable"} />;

  const driftColor =
    driftStatus === "NORMAL"
      ? "text-green-600 dark:text-green-400"
      : driftStatus === "WARNING"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const govStatus: GovernanceStatus = rollup?.governanceStatus ?? "RED";
  const govColor =
    govStatus === "GREEN"
      ? "text-green-600 dark:text-green-400"
      : govStatus === "AMBER"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Governance" snapshotId={liveState.snapshot_id} timestamp={liveState.timestamp} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Governance Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System health, compliance, and incident management</p>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Governance</p>
            <p className={`text-xl font-bold ${govColor}`}>{govStatus}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Model Drift</p>
            <p className={`text-xl font-bold ${driftColor}`}>{driftStatus}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Validation</p>
            <p className={`text-xl font-bold ${lastValidation?.valid !== false ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {lastValidation?.valid !== false ? "PASS" : "FAIL"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pipeline</p>
            <p className={`text-xl font-bold ${metrics.fetchErrorCount === 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {metrics.fetchErrorCount === 0 ? "OK" : `${metrics.fetchErrorCount} err`}
            </p>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-blue-500 dark:text-blue-400 mt-0.5 shrink-0">{card.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {card.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{card.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick metrics */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Snapshot Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Snapshot Rotations</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{metrics.snapshotRotations}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Demo Mutations</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{metrics.demoMutationsApplied}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Fetch Errors</p>
              <p className={`font-semibold ${metrics.fetchErrorCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                {metrics.fetchErrorCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Active Alerts</p>
              <p className={`font-semibold ${liveState.active_alerts > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
                {liveState.active_alerts}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
