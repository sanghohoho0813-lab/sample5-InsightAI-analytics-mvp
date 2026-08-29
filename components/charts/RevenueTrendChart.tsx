"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { aggregateSeries } from "@/lib/analytics-engine";
import { formatDateKR, formatDateShort, formatKRW, formatKRWExact, formatNumber } from "@/lib/format";
import { DailyPoint } from "@/lib/types";
import ChartTooltip from "./ChartTooltip";
import { HUES, HueName } from "@/lib/palette";

type Unit = "day" | "week" | "month";
const UNITS: { value: Unit; label: string }[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

export type TrendMetric = "revenue" | "orders" | "customers" | "conversion" | "aov";

const METRIC_META: Record<
  TrendMetric,
  { key: keyof DailyPoint; label: string; hue: HueName; full: (v: number) => string; axis: (v: number) => string }
> = {
  revenue: {
    key: "revenue",
    label: "매출",
    hue: "blue",
    full: formatKRWExact,
    axis: (v) => formatKRW(v).replace("₩", ""),
  },
  orders: { key: "orders", label: "주문 수", hue: "violet", full: (v) => `${formatNumber(v)}건`, axis: formatNumber },
  customers: { key: "customers", label: "고객 수", hue: "cyan", full: (v) => `${formatNumber(v)}명`, axis: formatNumber },
  conversion: {
    key: "conversionRate",
    label: "전환율",
    hue: "mint",
    full: (v) => `${v.toFixed(2)}%`,
    axis: (v) => `${v}%`,
  },
  aov: { key: "aov", label: "평균 주문 금액", hue: "amber", full: formatKRWExact, axis: (v) => formatKRW(v).replace("₩", "") },
};

/**
 * 지표 추이 차트 — 선택된 KPI를 따라가며, 현재 vs 이전 기간 비교,
 * 일/주/월 토글, 지점 클릭 상세를 제공한다.
 */
export default function RevenueTrendChart({
  points,
  metric = "revenue",
}: {
  points: DailyPoint[];
  metric?: TrendMetric;
}) {
  const [unit, setUnit] = useState<Unit>("day");
  const [selected, setSelected] = useState<DailyPoint | null>(null);

  const meta = METRIC_META[metric];
  const c = HUES[meta.hue];
  const data = useMemo(() => aggregateSeries(points, unit), [points, unit]);
  // 이전 기간 비교선은 매출에만 제공된다(다른 지표는 집계 시 비교값이 없음).
  const hasPrev = metric === "revenue" && data.some((p) => p.prevRevenue != null);
  const showDots = data.length <= 34;

  // 지표가 바뀌면 열려 있던 상세를 닫는다.
  useEffect(() => setSelected(null), [metric]);

  const labelFor = (d: string) => (unit === "month" ? d.replace("-", ".") : formatDateShort(d));

  return (
    <div className="card card-hover animate-fade-up flex h-full flex-col p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[22.5px] font-bold text-ink">{meta.label} 추이</h3>
          <div className="mt-1.5 flex items-center gap-3 text-[17px] text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full" style={{ background: c.base }} /> {meta.label}
            </span>
            {hasPrev && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[3px] w-4 rounded-full"
                  style={{ backgroundImage: "repeating-linear-gradient(90deg,#b9d5ff 0 4px,transparent 4px 7px)" }}
                />
                전 기간 비교
              </span>
            )}
          </div>
        </div>
        <div className="flex rounded-[10px] border border-line bg-surface-soft p-0.5">
          {UNITS.map((u) => (
            <button
              key={u.value}
              onClick={() => { setUnit(u.value); setSelected(null); }}
              aria-pressed={unit === u.value}
              className={`rounded-lg px-3 py-1.5 text-[17px] font-medium transition-all duration-200 ${
                unit === u.value ? "bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[300px] flex-1 md:min-h-[340px]">
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
                <stop offset="0%" stopColor={c.base} stopOpacity={0.18} />
                <stop offset="100%" stopColor={c.base} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ece7dc" vertical={false} />
            <XAxis dataKey="date" tickFormatter={labelFor} axisLine={false} tickLine={false} minTickGap={28} dy={8} />
            <YAxis
              tickFormatter={meta.axis}
              axisLine={false}
              tickLine={false}
              width={86}
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
                  rows.push({ name: "전 기간", value: formatKRWExact(p.prevRevenue), color: "#b9d5ff" });
                return <ChartTooltip label={unit === "month" ? String(label) : formatDateKR(String(label))} rows={rows} />;
              }}
            />
            {hasPrev && (
              <Area
                type="monotone"
                dataKey="prevRevenue"
                stroke="#b9d5ff"
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
              dot={showDots ? { r: 3, fill: c.base, stroke: "#ffffff", strokeWidth: 1.5 } : false}
              activeDot={{ r: 5.5, fill: c.base, stroke: "#ffffff", strokeWidth: 2.5 }}
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-line bg-surface-soft px-4 py-3 text-[18px]">
          <span className="font-bold text-ink">
            {unit === "month" ? selected.date.replace("-", ".") : formatDateKR(selected.date)}
          </span>
          <span className="text-ink-soft">매출 <b className="text-ink">{formatKRWExact(selected.revenue)}</b></span>
          <span className="text-ink-soft">주문 <b className="text-ink">{formatNumber(selected.orders)}건</b></span>
          <span className="text-ink-soft">전환율 <b className="text-ink">{selected.conversionRate}%</b></span>
          {hasPrev && selected.prevRevenue != null && (
            <span className="text-ink-soft">전 기간 <b className="text-ink">{formatKRWExact(selected.prevRevenue)}</b></span>
          )}
          <button onClick={() => setSelected(null)} className="ml-auto font-semibold text-ink-dim hover:text-ink">
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
