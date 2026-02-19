"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RiskTimelineProps {
  zoneName?: string;
}

const MOCK_HISTORY = [
  { time: "13:00", risk: 0.15 },
  { time: "13:15", risk: 0.2 },
  { time: "13:30", risk: 0.25 },
  { time: "13:45", risk: 0.35 },
  { time: "14:00", risk: 0.55 },
  { time: "14:15", risk: 0.7 },
  { time: "14:30", risk: 0.82 },
  { time: "14:45", risk: 0.75 },
  { time: "15:00", risk: 0.6 },
];

function getRiskColor(risk: number): string {
  if (risk >= 0.6) return "#ef4444";
  if (risk >= 0.4) return "#f59e0b";
  return "#22c55e";
}

export default function RiskTimeline({ zoneName }: RiskTimelineProps) {
  const data = MOCK_HISTORY.map((d) => ({
    ...d,
    riskPct: Math.round(d.risk * 100),
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Risk Timeline {zoneName ? `— ${zoneName}` : ""}
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
              formatter={(value: number) => [`${value}%`, "Risk"]}
            />
            <Bar dataKey="riskPct" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={index} fill={getRiskColor(entry.risk)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
