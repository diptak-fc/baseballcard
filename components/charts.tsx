"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from "recharts";

const NAVY = "#33628E";
const NAVY_DARK = "#183A5A";
const GRID = "#E4E9F0";
const MUTED = "#7B8698";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg border border-surface-line bg-white px-3 py-2 text-xs shadow-card">
      <div className="font-semibold text-ink">{label}</div>
      <div className="text-ink-soft">
        Score: <span className="font-bold text-navy-700">{typeof v === "number" ? v.toFixed(1) : v}</span> / 10
      </div>
    </div>
  );
}

export function ScoreBarChart({
  data,
  height = 240,
}: {
  data: { label: string; score: number | null }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }} barCategoryGap="35%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F2F6FA" }} />
        <Bar dataKey="score" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
  height = 240,
}: {
  data: { label: string; score: number | null }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={{ stroke: GRID }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 8, 10]}
          tick={{ fill: MUTED, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke={NAVY_DARK}
          strokeWidth={2}
          dot={{ r: 4, fill: NAVY_DARK, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
