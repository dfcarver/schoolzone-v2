"use client";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { ForecastPoint } from "@/lib/types";

interface ForecastChartProps {
  data: ForecastPoint[];
  title?: string;
}

export default function ForecastChart({
  data,
  title = "30-Minute Risk Forecast",
}: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-sm text-gray-400">No forecast data available</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    riskPct: Math.round(d.risk * 100),
    confPct: Math.round(d.confidence * 100),
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
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
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "riskPct" ? "Risk" : "Confidence",
              ]}
            />
            <Area
              type="monotone"
              dataKey="confPct"
              fill="#dbeafe"
              stroke="none"
              fillOpacity={0.4}
            />
            <Line
              type="monotone"
              dataKey="riskPct"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: "#ef4444" }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="confPct"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-red-500 rounded" />
          <span className="text-xs text-gray-500">Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-500 rounded border-dashed" />
          <span className="text-xs text-gray-500">Confidence</span>
        </div>
      </div>
    </div>
  );
}
