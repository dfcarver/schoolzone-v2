"use client";

import { ReactNode } from "react";

interface CalloutPanelProps {
  title: string;
  children: ReactNode;
  variant?: "default" | "emerald" | "amber";
}

const VARIANT_STYLES = {
  default: "border-gray-200 bg-gray-50",
  emerald: "border-emerald-200 bg-emerald-50/50",
  amber: "border-amber-200 bg-amber-50/50",
};

export default function CalloutPanel({ title, children, variant = "default" }: CalloutPanelProps) {
  return (
    <div className={`border rounded-lg p-5 ${VARIANT_STYLES[variant]}`}>
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h4>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </div>
  );
}
