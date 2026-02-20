"use client";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
      {subtitle && (
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">{subtitle}</p>
      )}
      <div className="mt-3 h-px bg-gradient-to-r from-emerald-700/30 via-amber-500/20 to-transparent" />
    </div>
  );
}
