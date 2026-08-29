"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ForecastPoint, ForecastSummary } from "@/lib/types";
import { formatDateKR, formatDateShort, formatKRW, formatKRWExact, formatNumber } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

/** 예측 차트 — 실측 라인 + 예측 라인 + 신뢰구간 밴드 */
export default function ForecastChart({ summary, height = 260 }: { summary: ForecastSummary; height?: number }) {
  const isCurrency = summary.format === "currency";
  const fmt = (v: number) => (isCurrency ? formatKRWExact(v) : formatNumber(v));
  const axisFmt = (v: number) => (isCurrency ? formatKRW(v).replace("₩", "") : formatNumber(v));
  // 신뢰구간을 스택 영역으로 그리기 위한 변환 (lower + band = upper)
  const data = summary.points.map((p) => ({
    ...p,
    band: p.upper != null && p.lower != null ? p.upper - p.lower : null,
  }));

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#ece7dc" vertical={false} />
          <XAxis dataKey="date" tickFormatter={formatDateShort} axisLine={false} tickLine={false} minTickGap={26} dy={8} />
          <YAxis tickFormatter={axisFmt} axisLine={false} tickLine={false} width={88} domain={["auto", "auto"]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as ForecastPoint & { band: number | null };
              const rows: { name: string; value: string; color?: string }[] = [];
              if (p.value != null) rows.push({ name: "실측", value: fmt(p.value), color: "#1478ff" });
              if (p.forecast != null && p.value == null) {
                rows.push({ name: "예상", value: fmt(p.forecast), color: "#12a9bf" });
                if (p.lower != null && p.upper != null)
                  rows.push({ name: "예상 범위", value: `${fmt(p.lower)} ~ ${fmt(p.upper)}` });
              }
              return <ChartTooltip label={formatDateKR(String(label))} rows={rows} />;
            }}
          />
          <Area dataKey="lower" stackId="band" stroke="none" fill="transparent" animationDuration={600} />
          <Area dataKey="band" stackId="band" stroke="none" fill="#12a9bf" fillOpacity={0.14} animationDuration={600} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1478ff"
            strokeWidth={2.2}
            dot={false}
            activeDot={{ r: 4.5, fill: "#1478ff", stroke: "#ffffff", strokeWidth: 2.5 }}
            animationDuration={700}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="#12a9bf"
            strokeWidth={2.2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4.5, fill: "#12a9bf", stroke: "#ffffff", strokeWidth: 2.5 }}
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
