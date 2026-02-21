"use client";

import { GovernanceStatus } from "@/lib/rollups";

interface ExecutiveKPIProps {
  label: string;
  value: string | number;
  subtitle?: string;
  governanceStatus?: GovernanceStatus;
}

const GOV_STYLES: Record<GovernanceStatus, { border: string; dot: string }> = {
  GREEN: { border: "border-green-300", dot: "bg-green-500" },
  AMBER: { border: "border-amber-300", dot: "bg-amber-500" },
  RED: { border: "border-red-400", dot: "bg-red-500" },
};

export default function ExecutiveKPI({
  label,
  value,
  subtitle,
  governanceStatus,
}: ExecutiveKPIProps) {
  const styles = governanceStatus
    ? GOV_STYLES[governanceStatus]
    : { border: "border-gray-200", dot: "bg-blue-500" };

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border ${styles.border} px-5 py-4 flex flex-col gap-1`}>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
      {subtitle && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</span>
      )}
    </div>
  );
}
