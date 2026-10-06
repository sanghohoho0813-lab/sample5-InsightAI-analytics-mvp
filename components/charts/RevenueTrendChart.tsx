"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { aggregateSeries } from "@/lib/analytics-engine";
import { formatAxisKRW, formatDateKR, formatDateShort, formatKRWExact, formatNumber } from "@/lib/format";
import { DailyPoint } from "@/lib/types";
import ChartTooltip from "./ChartTooltip";
import { COLORS } from "@/lib/palette";
import { MetricKey } from "@/lib/types";

type Unit = "day" | "week" | "month";
const UNITS: { value: Unit; label: string }[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];


const METRIC_META: Record<
  MetricKey,
  { key: keyof DailyPoint; label: string; full: (v: number) => string; axis: (v: number) => string }
> = {
  revenue: {
    key: "revenue",
    label: "매출",
    full: formatKRWExact,
    axis: (v) => formatAxisKRW(v),
  },
  orders: { key: "orders", label: "주문 수", full: (v) => `${formatNumber(v)}건`, axis: formatNumber },
  customers: { key: "customers", label: "고객 수", full: (v) => `${formatNumber(v)}명`, axis: formatNumber },
  conversion: {
    key: "conversionRate",
    label: "전환율",
    full: (v) => `${v.toFixed(2)}%`,
    axis: (v) => `${v}%`,
  },
  aov: { key: "aov", label: "평균 주문 금액", full: formatKRWExact, axis: (v) => formatAxisKRW(v) },
};

/**
 * 지표 추이 차트 — 선택된 KPI를 따라가며, 현재 vs 이전 기간 비교,
 * 일/주/월 토글, 지점 클릭 상세를 제공한다.
 */
export default function RevenueTrendChart({
  points,
  metric = "revenue",
  markDate,
}: {
  points: DailyPoint[];
  metric?: MetricKey;
  /** 이상치 발생일처럼 강조할 날짜(일간 보기에서만 표시) */
  markDate?: string;
}) {
  const [unit, setUnit] = useState<Unit>("day");
  const [selected, setSelected] = useState<DailyPoint | null>(null);

  const meta = METRIC_META[metric];
  const c = { base: COLORS.brand };
  const data = useMemo(() => aggregateSeries(points, unit), [points, unit]);
  // 이전 기간 비교선은 매출에만 제공된다(다른 지표는 집계 시 비교값이 없음).
  const hasPrev = metric === "revenue" && data.some((p) => p.prevRevenue != null);
  const showDots = data.length <= 34;

  // 지표가 바뀌면 열려 있던 상세를 닫는다.
  useEffect(() => setSelected(null), [metric]);

  const labelFor = (d: string) => (unit === "month" ? d.replace("-", ".") : formatDateShort(d));

  return (
    <section className="card flex h-full flex-col p-5 md:p-6" aria-label={`${meta.label} 추이`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-card font-bold text-ink">{meta.label} 추이</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ background: c.base }} /> {meta.label}
            </span>
            {hasPrev && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[3px] w-4 rounded-full"
                  style={{ backgroundImage: `repeating-linear-gradient(90deg,${COLORS.compare} 0 4px,transparent 4px 7px)` }}
                />
                이전 기간
              </span>
            )}
          </div>
        </div>
        <div className="flex rounded-control border border-line bg-surface-soft p-0.5" role="group" aria-label="집계 단위">
          {UNITS.map((u) => (
            <button
              key={u.value}
              onClick={() => { setUnit(u.value); setSelected(null); }}
              aria-pressed={unit === u.value}
              className={`min-h-9 rounded-[8px] px-3 text-meta font-semibold transition-colors ${
                unit === u.value ? "bg-surface text-ink shadow-subtle" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[260px] md:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 6, right: 8, left: 0, bottom: 0 }}
            onClick={(state) => {
              const idx = state?.activeTooltipIndex;
              if (typeof idx === "number" && data[idx]) setSelected(data[idx]);
            }}
          >
            <defs>
              <linearGradient id={`revFill-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.base} stopOpacity={0.12} />
                <stop offset="100%" stopColor={c.base} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLORS.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={labelFor} axisLine={false} tickLine={false} minTickGap={28} dy={8} />
            <YAxis
              tickFormatter={meta.axis}
              axisLine={false}
              tickLine={false}
              width={64}
              domain={["auto", "auto"]}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as DailyPoint;
                const rows: { name: string; value: string; color: string }[] = [
                  { name: meta.label, value: meta.full(p[meta.key] as number), color: c.base },
                ];
                if (hasPrev && p.prevRevenue != null)
                  rows.push({ name: "이전 기간", value: formatKRWExact(p.prevRevenue), color: COLORS.compare });
                return <ChartTooltip label={unit === "month" ? String(label) : formatDateKR(String(label))} rows={rows} />;
              }}
            />
            {markDate && unit === "day" && data.some((p) => p.date === markDate) && (
              <ReferenceLine
                x={markDate}
                stroke={COLORS.negative}
                strokeDasharray="4 3"
                label={{ value: "발생일", position: "insideTopRight", fill: COLORS.negative, fontSize: 12 }}
              />
            )}
            {hasPrev && (
              <Area
                type="monotone"
                dataKey="prevRevenue"
                stroke={COLORS.compare}
                strokeWidth={1.8}
                strokeDasharray="5 4"
                fill="none"
                dot={false}
                animationDuration={600}
              />
            )}
            <Area
              type="monotone"
              dataKey={meta.key as string}
              stroke={c.base}
              strokeWidth={2.4}
              fill={`url(#revFill-${metric})`}
              dot={showDots ? { r: 2.5, fill: c.base, stroke: "#ffffff", strokeWidth: 1.5 } : false}
              activeDot={{ r: 5.5, fill: c.base, stroke: "#ffffff", strokeWidth: 2.5 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className="animate-fade-in mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-control bg-surface-soft px-4 py-3 text-meta">
          <span className="font-bold text-ink">
            {unit === "month" ? selected.date.replace("-", ".") : formatDateKR(selected.date)}
          </span>
          <span className="text-ink-soft">
            {meta.label} <b className="text-ink">{meta.full(selected[meta.key] as number)}</b>
          </span>
          {metric !== "revenue" && (
            <span className="text-ink-soft">
              매출 <b className="text-ink">{formatKRWExact(selected.revenue)}</b>
            </span>
          )}
          {hasPrev && selected.prevRevenue != null && (
            <span className="text-ink-soft">이전 기간 <b className="text-ink">{formatKRWExact(selected.prevRevenue)}</b></span>
          )}
          <button onClick={() => setSelected(null)} className="ml-auto min-h-9 font-semibold text-ink-soft hover:text-ink">
            닫기
          </button>
        </div>
      )}
    </section>
  );
}
