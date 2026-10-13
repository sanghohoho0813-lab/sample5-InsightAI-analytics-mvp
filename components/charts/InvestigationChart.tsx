"use client";

import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMetric } from "@/lib/anomaly-engine";
import { formatAxisKRW, formatDateKR, formatDateShort, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import ChartTooltip from "./ChartTooltip";

/**
 * 조사 화면의 차트 — 실제 값(선)과 평소 수준(점선), 변화가 이어진 구간(음영)만 보여준다.
 * 2~3주 정도의 짧은 구간이라 좁은 화면에서도 날짜를 읽을 수 있다.
 */
export default function InvestigationChart({
  series,
  metricKey,
  label,
  start,
  end,
  down,
}: {
  series: { date: string; value: number; expected: number | null }[];
  metricKey: string;
  label: string;
  start: string;
  end: string;
  down: boolean;
}) {
  const axis = (v: number) =>
    metricKey === "conversionRate" ? `${v.toFixed(1)}%` : metricKey === "revenue" || metricKey === "aov" ? formatAxisKRW(v) : formatNumber(v);
  const tone = down ? COLORS.negative : COLORS.positive;

  return (
    <figure className="min-w-0">
      <div className="h-[200px] md:h-[240px]" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            {start === end ? (
              <ReferenceLine x={start} stroke={tone} strokeOpacity={0.18} strokeWidth={14} />
            ) : (
              <ReferenceArea x1={start} x2={end} fill={tone} fillOpacity={0.08} stroke={tone} strokeOpacity={0.25} ifOverflow="extendDomain" />
            )}
            <XAxis dataKey="date" tickFormatter={formatDateShort} axisLine={false} tickLine={false} minTickGap={24} dy={8} />
            <YAxis tickFormatter={axis} axisLine={false} tickLine={false} width={60} domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload, label: d }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as { value: number; expected: number | null };
                const rows: { name: string; value: string; color: string }[] = [{ name: label, value: fmtMetric(metricKey, p.value), color: COLORS.brand }];
                if (p.expected != null) rows.push({ name: "평소 수준", value: fmtMetric(metricKey, p.expected), color: COLORS.dim });
                return <ChartTooltip label={formatDateKR(String(d))} rows={rows} />;
              }}
            />
            <Line type="monotone" dataKey="expected" stroke={COLORS.dim} strokeWidth={1.6} strokeDasharray="5 4" dot={false} connectNulls />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS.brand}
              strokeWidth={2.4}
              dot={{ r: 2.5, fill: COLORS.brand, stroke: "#ffffff", strokeWidth: 1.5 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-[3px] w-4 rounded-full" style={{ background: COLORS.brand }} /> {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-[3px] w-4 rounded-full"
            style={{ backgroundImage: `repeating-linear-gradient(90deg,${COLORS.dim} 0 4px,transparent 4px 7px)` }}
          />
          평소 수준(직전 7일 중앙값)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded-sm" style={{ background: tone, opacity: 0.18 }} /> 변화 구간
        </span>
      </figcaption>
    </figure>
  );
}
