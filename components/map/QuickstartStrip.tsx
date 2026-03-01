"use client";

import { WeatherCondition } from "@/lib/mapFeatures";
import { WhatIfScenarioId } from "@/lib/mapFeatures";
import { MapFeatureFlags } from "./MapToolbar";

export interface QuickstartPreset {
  label: string;
  icon: string;
  description: string;
  timeMin: number;
  weather: WeatherCondition;
  features: Partial<MapFeatureFlags>;
  scenario: WhatIfScenarioId | null;
}

export const QUICKSTART_PRESETS: QuickstartPreset[] = [
  {
    label: "Rush Hour + Rain",
    icon: "🌧️",
    description: "3:15 PM rainy dismissal — watch corridors saturate",
    timeMin: 15 * 60 + 15,
    weather: "rain",
    features: { weather: true, geofences: true, incidents: true },
    scenario: null,
  },
  {
    label: "Dismissal Crisis",
    icon: "🚨",
    description: "3:30 PM peak — model interventions and what-ifs",
    timeMin: 15 * 60 + 30,
    weather: "clear",
    features: { incidents: true, whatIf: true, interventions: true },
    scenario: null,
  },
  {
    label: "Morning Drop-off",
    icon: "🌅",
    description: "7:45 AM — parent queues and flow rates by school",
    timeMin: 7 * 60 + 45,
    weather: "clear",
    features: { parentFlow: true, interventions: true },
    scenario: null,
  },
  {
    label: "Fog Alert",
    icon: "🌫️",
    description: "2:50 PM dense fog — worst-case with diversion scenario",
    timeMin: 14 * 60 + 50,
    weather: "fog",
    features: { weather: true, geofences: true, whatIf: true },
    scenario: "traffic_diversion",
  },
];

interface QuickstartStripProps {
  onApply: (preset: QuickstartPreset) => void;
  activePreset: string | null;
}

export default function QuickstartStrip({ onApply, activePreset }: QuickstartStripProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Try a scenario</p>
      <div className="flex gap-2 flex-wrap">
        {QUICKSTART_PRESETS.map((preset) => {
          const isActive = activePreset === preset.label;
          return (
            <button
              key={preset.label}
              onClick={() => onApply(preset)}
              title={preset.description}
              className={`inline-flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg border transition-colors ${
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-semibold"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <span>{preset.icon}</span>
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
