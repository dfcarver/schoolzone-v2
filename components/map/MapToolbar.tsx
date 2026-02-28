"use client";

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

const FEATURE_ITEMS: { key: keyof MapFeatureFlags; label: string; icon: string }[] = [
  { key: "incidents", label: "Incidents", icon: "📍" },
  { key: "geofences", label: "Geofences", icon: "🛡️" },
  { key: "weather", label: "Weather", icon: "🌤️" },
  { key: "whatIf", label: "What-If", icon: "🔮" },
  { key: "parentFlow", label: "Queues", icon: "🚗" },
  { key: "interventions", label: "Dispatch", icon: "🚦" },
  { key: "traffic", label: "Traffic", icon: "🗺️" },
];

export default function MapToolbar({ features, onToggle }: MapToolbarProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FEATURE_ITEMS.map((item) => (
        <button
          key={item.key}
          onClick={() => onToggle(item.key)}
          className={`inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
            features[item.key]
              ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 font-semibold"
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <span className="text-xs">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
