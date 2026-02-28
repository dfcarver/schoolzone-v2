"use client";

import { WeatherCondition, WEATHER_PROFILES } from "@/lib/mapFeatures";

interface WeatherPanelProps {
  weather: WeatherCondition;
  onChangeWeather: (w: WeatherCondition) => void;
}

const CONDITIONS: WeatherCondition[] = ["clear", "rain", "snow", "fog"];

export default function WeatherPanel({ weather, onChangeWeather }: WeatherPanelProps) {
  const profile = WEATHER_PROFILES[weather];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-3">Weather Impact</h4>

      <div className="flex gap-1.5 mb-3">
        {CONDITIONS.map((c) => {
          const p = WEATHER_PROFILES[c];
          return (
            <button
              key={c}
              onClick={() => onChangeWeather(c)}
              className={`flex-1 text-center py-2 rounded-lg border text-xs transition-colors ${
                weather === c
                  ? "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-semibold"
                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span className="text-lg block">{p.icon}</span>
              <span className="block mt-0.5">{p.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Congestion Impact</span>
          <span className={`font-medium ${profile.congestionMultiplier > 1 ? "text-red-600" : "text-green-600"}`}>
            {profile.congestionMultiplier > 1 ? "+" : ""}{Math.round((profile.congestionMultiplier - 1) * 100)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500 dark:text-gray-400">Speed Reduction</span>
          <span className={`font-medium ${profile.speedReduction > 0 ? "text-amber-600" : "text-green-600"}`}>
            {profile.speedReduction > 0 ? `-${profile.speedReduction} mph` : "None"}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-800">
          {profile.visibilityNote}
        </p>
      </div>
    </div>
  );
}
