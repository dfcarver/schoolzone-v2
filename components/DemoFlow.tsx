"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Overview",       href: "/" },
  { label: "Command Brief",  href: "/executive" },
  { label: "Operations",     href: "/operations/dashboard" },
  { label: "Analytics",      href: "/analytics" },
  { label: "Procurement",    href: "/executive/procurement/architecture" },
];

export default function DemoFlow() {
  const pathname = usePathname();

  const currentIndex = STEPS.findIndex((s) => {
    if (s.href === "/executive") return pathname === "/executive" || (pathname.startsWith("/executive/") && !pathname.startsWith("/executive/procurement"));
    if (s.href === "/executive/procurement/architecture") return pathname.startsWith("/executive/procurement");
    return pathname === s.href || pathname.startsWith(s.href + "/");
  });

  const prev = currentIndex > 0 ? STEPS[currentIndex - 1] : null;
  const next = currentIndex < STEPS.length - 1 ? STEPS[currentIndex + 1] : null;

  return (
    <div className="border-t border-slate-800 bg-slate-950/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Prev */}
      <div className="w-36">
        {prev && (
          <Link href={prev.href} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors group">
            <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {prev.label}
          </Link>
        )}
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <Link key={step.href} href={step.href} title={step.label} className="group flex flex-col items-center gap-1">
            <span className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex
                ? "bg-blue-500 scale-125"
                : i < currentIndex
                ? "bg-slate-600"
                : "bg-slate-800 group-hover:bg-slate-600"
            }`} />
          </Link>
        ))}
      </div>

      {/* Next */}
      <div className="w-36 flex justify-end">
        {next && (
          <Link href={next.href} className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors group">
            {next.label}
            <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
