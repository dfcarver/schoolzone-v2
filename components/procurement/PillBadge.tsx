"use client";

interface PillBadgeProps {
  label: string;
  variant?: "implemented" | "demo" | "planned" | "ready" | "in-progress" | "not-started" | "open" | "mitigated" | "monitoring" | "accepted" | "complete" | "active" | "default";
}

const VARIANT_STYLES: Record<string, string> = {
  implemented: "bg-emerald-100 text-emerald-800 border-emerald-200",
  demo: "bg-blue-100 text-blue-800 border-blue-200",
  planned: "bg-gray-100 text-gray-600 border-gray-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "in-progress": "bg-amber-100 text-amber-800 border-amber-200",
  "not-started": "bg-gray-100 text-gray-500 border-gray-200",
  open: "bg-red-100 text-red-700 border-red-200",
  mitigated: "bg-emerald-100 text-emerald-800 border-emerald-200",
  monitoring: "bg-amber-100 text-amber-800 border-amber-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  complete: "bg-emerald-100 text-emerald-800 border-emerald-200",
  active: "bg-blue-100 text-blue-800 border-blue-200",
  default: "bg-gray-100 text-gray-600 border-gray-200",
};

function resolveVariant(label: string, variant?: string): string {
  if (variant && VARIANT_STYLES[variant]) return VARIANT_STYLES[variant];
  const key = label.toLowerCase().replace(/\s+/g, "-");
  return VARIANT_STYLES[key] ?? VARIANT_STYLES.default;
}

export default function PillBadge({ label, variant }: PillBadgeProps) {
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded border ${resolveVariant(label, variant)}`}>
      {label}
    </span>
  );
}
