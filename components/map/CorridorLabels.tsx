"use client";

import { OverlayViewF } from "@react-google-maps/api";
import { CongestionEntry, congestionColor } from "@/lib/hooks/useCongestionEngine";

interface CorridorLabelsProps {
  corridors: CongestionEntry[];
  visible: boolean;
}

function pathMidpoint(path: { lat: number; lng: number }[]): { lat: number; lng: number } {
  if (path.length === 0) return { lat: 0, lng: 0 };
  const mid = Math.floor(path.length / 2);
  return path[mid];
}

export default function CorridorLabels({ corridors, visible }: CorridorLabelsProps) {
  if (!visible) return null;

  return (
    <>
      {corridors.map((c) => {
        const pos = pathMidpoint(c.path);
        const color = congestionColor(c.congestion);
        const pct = Math.round(c.congestion * 100);

        return (
          <OverlayViewF
            key={`label-${c.id}`}
            position={pos}
            mapPaneName="overlayMouseTarget"
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h + 8) })}
          >
            <div
              style={{
                borderLeftColor: color,
                pointerEvents: "none",
                userSelect: "none",
              }}
              className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 border-l-[3px] rounded px-2 py-0.5 shadow-sm whitespace-nowrap"
            >
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200">
                {c.school.name}
              </span>
              <span className="text-[10px] font-semibold" style={{ color }}>
                {pct}%
              </span>
            </div>
          </OverlayViewF>
        );
      })}
    </>
  );
}
