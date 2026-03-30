"use client";

import { useState } from "react";

const STEPS = [
  {
    step: 1,
    title: "Pick a city",
    detail: "Use the city selector on the map to switch between Springfield, IL (live data) and Abu Dhabi zones (demo model). Watch KPIs refresh instantly.",
  },
  {
    step: 2,
    title: "Simulate an incident",
    detail: "Under Emerging Risks, click 🔴 Simulate on any zone. The risk score spikes to 94% and a pulsing marker appears on the corridor map.",
  },
  {
    step: 3,
    title: "Dispatch resources",
    detail: "Click ⚡ Dispatch on the same zone and choose an action (e.g. Deploy crossing guard). Each dispatch visibly reduces the risk score from 94% downward.",
  },
  {
    step: 4,
    title: "Watch the map update",
    detail: "The corridor polyline changes color live as risk drops: red → amber → green. The pulsing incident marker stays until the zone is Resolved.",
  },
  {
    step: 5,
    title: "Review AI Brief",
    detail: "Select a zone in the AI Brief section. It auto-fires a brief on the highest-risk corridor and surfaces prioritised interventions with confidence scores.",
  },
  {
    step: 6,
    title: "Check governance",
    detail: "Open Governance to verify compliance status, model drift, and validation pass/fail. Use Controls & Compliance to drill into the audit log.",
  },
  {
    step: 7,
    title: "Export for stakeholders",
    detail: "Click Export PDF to generate a print-ready brief, or Export JSON for structured data handoff to the client's systems.",
  },
];

export default function DemoGuide() {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🎬</span>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Demo Guide</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{STEPS.length}-step walkthrough</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
          <div className="space-y-2">
            {STEPS.map((s) => (
              <div key={s.step}>
                <button
                  onClick={() => setActiveStep(activeStep === s.step ? null : s.step)}
                  className="w-full flex items-center gap-3 py-2 text-left group"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                    {s.step}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-1">
                    {s.title}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-300 dark:text-gray-600 transition-transform ${activeStep === s.step ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {activeStep === s.step && (
                  <p className="ml-9 text-xs text-gray-500 dark:text-gray-400 leading-relaxed pb-2">
                    {s.detail}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
