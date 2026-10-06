"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ForecastPoint, ForecastSummary } from "@/lib/types";
import { formatAxisKRW, formatDateKR, formatDateShort, formatKRWExact, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import ChartTooltip from "./ChartTooltip";

/**
 * 예측 차트 — 실측(블루) + 예측(틸 점선) + 예상 범위 밴드.
 * compact는 대시보드 카드용으로 축·격자를 숨기고 최근 2주만 보여준다.
 */
export default function ForecastChart({
  summary,
  height = 260,
  compact = false,
}: {
  summary: ForecastSummary;
  height?: number;
  compact?: boolean;
}) {
  const isCurrency = summary.format === "currency";
  const fmt = (v: number) => (isCurrency ? formatKRWExact(v) : formatNumber(v));
  const axisFmt = (v: number) => (isCurrency ? formatAxisKRW(v) : formatNumber(v));
  const points = compact ? summary.points.slice(-21) : summary.points;
  // 신뢰구간을 스택 영역으로 그리기 위한 변환 (lower + band = upper)
  const data = points.map((p) => ({
    ...p,
    band: p.upper != null && p.lower != null ? p.upper - p.lower : null,
  }));

  return (
    <div className="min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={compact ? { top: 4, right: 0, left: 0, bottom: 0 } : { top: 6, right: 8, left: 0, bottom: 0 }}>
          {!compact && <CartesianGrid stroke={COLORS.grid} vertical={false} />}
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            axisLine={false}
            tickLine={false}
            minTickGap={26}
            dy={8}
            hide={compact}
          />
          <YAxis tickFormatter={axisFmt} axisLine={false} tickLine={false} width={64} domain={["auto", "auto"]} hide={compact} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as ForecastPoint & { band: number | null };
              const rows: { name: string; value: string; color?: string }[] = [];
              if (p.value != null) rows.push({ name: "실측", value: fmt(p.value), color: COLORS.brand });
              if (p.forecast != null && p.value == null) {
                rows.push({ name: "예측", value: fmt(p.forecast), color: COLORS.accent });
                if (p.lower != null && p.upper != null) rows.push({ name: "예상 범위", value: `${fmt(p.lower)} ~ ${fmt(p.upper)}` });
              }
              return <ChartTooltip label={formatDateKR(String(label))} rows={rows} />;
            }}
          />
          <Area dataKey="lower" stackId="band" stroke="none" fill="transparent" animationDuration={500} />
          <Area dataKey="band" stackId="band" stroke="none" fill={COLORS.accent} fillOpacity={0.12} animationDuration={500} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={COLORS.brand}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: COLORS.brand, stroke: "#ffffff", strokeWidth: 2 }}
            animationDuration={500}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={COLORS.accent}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            activeDot={{ r: 4, fill: COLORS.accent, stroke: "#ffffff", strokeWidth: 2 }}
            animationDuration={500}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
