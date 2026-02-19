"use client";

interface KPIProps {
  label: string;
  value: string | number;
  status?: "normal" | "warning" | "critical";
}

const STATUS_STYLES: Record<string, string> = {
  normal: "border-gray-200",
  warning: "border-amber-300",
  critical: "border-red-400",
};

const STATUS_DOT: Record<string, string> = {
  normal: "bg-green-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export default function KPI({ label, value, status = "normal" }: KPIProps) {
  return (
    <div
      className={`bg-white rounded-lg border ${STATUS_STYLES[status]} px-5 py-4 flex flex-col gap-1`}
    >
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-2xl font-semibold text-gray-900">{value}</span>
    </div>
  );
}
