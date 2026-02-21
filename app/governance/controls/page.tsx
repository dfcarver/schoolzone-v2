"use client";

import { useMemo } from "react";
import { useLiveState } from "@/lib/useLiveState";
import { deriveDriftStatus } from "@/lib/rollups";
import { getMetrics } from "@/lib/metrics";
import { getLogBuffer } from "@/lib/logger";
import Topbar from "@/components/Topbar";
import { PageSkeleton } from "@/components/Skeleton";
import ErrorState from "@/components/ErrorState";

export default function ControlsPage() {
  const { liveState, loading, error, lastValidation } = useLiveState();

  const driftStatus = useMemo(
    () => (liveState ? deriveDriftStatus(liveState) : "NORMAL"),
    [liveState]
  );

  const metrics = getMetrics();
  const logs = getLogBuffer();
  const recentLogs = logs.slice(-20).reverse();

  if (loading) return <PageSkeleton />;
  if (error || !liveState) return <ErrorState message={error ?? "Demo Data Unavailable"} />;

  const driftColor =
    driftStatus === "NORMAL"
      ? "text-green-700 bg-green-50 border-green-200"
      : driftStatus === "WARNING"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="flex flex-col h-screen">
      <Topbar title="Governance — Controls" snapshotId={liveState.snapshot_id} timestamp={liveState.timestamp} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Controls & Compliance</h1>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`border rounded-lg p-4 ${driftColor}`}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1">Model Drift</p>
            <p className="text-2xl font-bold">{driftStatus}</p>
            <p className="text-xs mt-1 opacity-80">
              {driftStatus === "NORMAL" ? "All systems within parameters" :
               driftStatus === "WARNING" ? "Some parameters approaching thresholds" :
               "Parameters outside acceptable range"}
            </p>
          </div>
          <div className={`border rounded-lg p-4 ${
            lastValidation?.valid !== false
              ? "text-green-700 bg-green-50 border-green-200"
              : "text-red-700 bg-red-50 border-red-200"
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1">Validation</p>
            <p className="text-2xl font-bold">{lastValidation?.valid !== false ? "PASS" : "FAIL"}</p>
            <p className="text-xs mt-1 opacity-80">
              {lastValidation?.errors.length ?? 0} errors, {lastValidation?.warnings.length ?? 0} warnings
            </p>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pipeline Health</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.fetchErrorCount === 0 ? "OK" : `${metrics.fetchErrorCount} errors`}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {metrics.fetchCount} fetches, {metrics.snapshotRotations} rotations
            </p>
          </div>
        </div>

        {/* Validation Details */}
        {lastValidation && !lastValidation.valid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-red-800 mb-3">Validation Errors</h3>
            <ul className="space-y-1">
              {lastValidation.errors.map((err, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="text-red-400 shrink-0">•</span>
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lastValidation && lastValidation.warnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-amber-800 mb-3">Warnings</h3>
            <ul className="space-y-1">
              {lastValidation.warnings.map((w, i) => (
                <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-amber-400 shrink-0">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Appendix A Contract Summary */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Appendix A — Contract Compliance</h3>
          <div className="space-y-2">
            {[
              { rule: "No backend / API routes", compliant: true },
              { rule: "Static JSON under /public/mock/", compliant: true },
              { rule: "Snapshot rotation via polling", compliant: true },
              { rule: "Demo mutations in-memory only", compliant: true },
              { rule: "No external network calls", compliant: true },
              { rule: "No server actions", compliant: true },
              { rule: "Runtime validation enabled", compliant: metrics.validationFailures === 0 },
            ].map((item) => (
              <div key={item.rule} className="flex items-center gap-2.5 py-1.5">
                <span className={`w-2 h-2 rounded-full ${item.compliant ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{item.rule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Audit Log (Recent)</h3>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No log entries</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {recentLogs.map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-1.5 text-xs border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="font-mono text-gray-400 shrink-0 w-20 truncate">{entry.timestamp.slice(11, 19)}</span>
                  <span className={`font-semibold uppercase shrink-0 w-12 ${
                    entry.level === "error" ? "text-red-600" :
                    entry.level === "warn" ? "text-amber-600" :
                    entry.level === "info" ? "text-blue-600" : "text-gray-400"
                  }`}>{entry.level}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
