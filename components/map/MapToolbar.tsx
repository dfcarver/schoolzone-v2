"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MapFeatureFlags {
  incidents: boolean;
  geofences: boolean;
  weather: boolean;
  whatIf: boolean;
  parentFlow: boolean;
  interventions: boolean;
  traffic: boolean;
}

interface MapToolbarProps {
  features: MapFeatureFlags;
  onToggle: (key: keyof MapFeatureFlags) => void;
}

const FEATURE_ITEMS: {
  key: keyof MapFeatureFlags;
  label: string;
  icon: string;
  tip: string;
}[] = [
  {
    key: "incidents",
    label: "Incidents",
    icon: "📍",
    tip: "Colored pins appear on the map — red HIGH, orange MED, blue LOW. Click a pin to see the event timeline and AI confidence score.",
  },
  {
    key: "geofences",
    label: "Geofences",
    icon: "🛡️",
    tip: "Blue circles appear around each school. They turn red when congestion exceeds the alert threshold. Click a circle to edit its radius, threshold, and speed limit.",
  },
  {
    key: "weather",
    label: "Weather",
    icon: "🌤️",
    tip: "A weather multiplier applies to all corridors — watch lines thicken and redden. Try the Dismissal time preset with Snow active.",
  },
  {
    key: "whatIf",
    label: "What-If",
    icon: "🔮",
    tip: "Select a scenario below the map to see projected vs. current congestion in a side-by-side comparison table.",
  },
  {
    key: "parentFlow",
    label: "Queues",
    icon: "🚗",
    tip: "Queue bars appear below the map showing parent pickup congestion at each school. Most active between 2:45 and 3:45 PM.",
  },
  {
    key: "interventions",
    label: "Dispatch",
    icon: "🚦",
    tip: "Click any corridor line or school card to select it, then choose an intervention type. Track it: Dispatched → En Route → On Scene → Completed.",
  },
  {
    key: "traffic",
    label: "Traffic",
    icon: "🗺️",
    tip: "Live Google Maps traffic overlay — green = free flow, red = heavy congestion. This reflects real current road conditions.",
  },
];

const SEEN_KEY = "szv2-seen-features";

function loadSeenFeatures(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function markFeatureSeen(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const seen = loadSeenFeatures();
    seen.add(key);
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // localStorage unavailable
  }
}

export default function MapToolbar({ features, onToggle }: MapToolbarProps) {
  const [seenFeatures, setSeenFeatures] = useState<Set<string>>(new Set());
  const [activePopover, setActivePopover] = useState<keyof MapFeatureFlags | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSeenFeatures(loadSeenFeatures());
  }, []);

  // Auto-dismiss popover after 6s
  useEffect(() => {
    if (!activePopover) return;
    dismissTimer.current = setTimeout(() => setActivePopover(null), 6000);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [activePopover]);

  // Dismiss on outside click
  useEffect(() => {
    if (!activePopover) return;
    const handler = () => setActivePopover(null);
    document.addEventListener("click", handler, { capture: true, once: true });
    return () => document.removeEventListener("click", handler, { capture: true });
  }, [activePopover]);

  const handleToggle = useCallback((key: keyof MapFeatureFlags) => {
    const turningOn = !features[key];
    onToggle(key);
    if (turningOn && !seenFeatures.has(key)) {
      setActivePopover(key);
      setSeenFeatures((prev) => new Set([...Array.from(prev), key]));
      markFeatureSeen(key);
    } else {
      setActivePopover(null);
    }
  }, [features, onToggle, seenFeatures]);

  return (
    <div className="relative flex flex-wrap gap-1.5">
      {FEATURE_ITEMS.map((item) => {
        const isPopoverOpen = activePopover === item.key;
        return (
          <div key={item.key} className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); handleToggle(item.key); }}
              className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                features[item.key]
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </button>

            {isPopoverOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full left-0 mb-2 z-50 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3"
              >
                {/* Arrow */}
                <div className="absolute -bottom-1.5 left-4 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-600 rotate-45" />
                <p className="text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {item.icon} {item.label}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
                  {item.tip}
                </p>
                <button
                  onClick={() => setActivePopover(null)}
                  className="mt-2 text-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  Got it ×
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
