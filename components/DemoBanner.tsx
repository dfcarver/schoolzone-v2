"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "schoolzone_demo_banner_v1";

export default function DemoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-blue-950/60 border-b border-blue-900/50 px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-300">
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-3.5 h-3.5 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <span className="truncate">
          <span className="font-semibold">Live Platform Preview</span>
          <span className="hidden sm:inline"> · Real-time traffic feeds · 24 school zones · Springfield, IL + Abu Dhabi · AWS live data</span>
          <span className="sm:hidden"> · Live traffic · 24 zones</span>
        </span>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 text-blue-500 hover:text-blue-200 transition-colors p-0.5"
        aria-label="Dismiss demo banner"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
