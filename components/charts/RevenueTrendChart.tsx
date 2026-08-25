"use client";

import { useMemo, useState } from "react";
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
import { formatDateKR, formatDateShort, formatKRW, formatKRWExact } from "@/lib/format";
import { DailyPoint } from "@/lib/types";
import ChartTooltip from "./ChartTooltip";

type Unit = "day" | "week" | "month";
const UNITS: { value: Unit; label: string }[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

/** 매출 추이 — 현재 vs 이전 기간 비교, 일/주/월 토글, 지점 클릭 상세 */
export default function RevenueTrendChart({ points }: { points: DailyPoint[] }) {
  const [unit, setUnit] = useState<Unit>("day");
  const [selected, setSelected] = useState<DailyPoint | null>(null);

  const data = useMemo(() => aggregateSeries(points, unit), [points, unit]);
  const hasPrev = data.some((p) => p.prevRevenue != null);
  const showDots = data.length <= 34;

  const labelFor = (d: string) => (unit === "month" ? d.replace("-", ".") : formatDateShort(d));

  return (
    <div className="card card-hover animate-fade-up flex h-full flex-col p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-bold text-ink">매출 추이</h3>
          <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-brand" /> 매출
            </span>
            {hasPrev && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-[3px] w-4 rounded-full"
                  style={{ backgroundImage: "repeating-linear-gradient(90deg,#bfdbfe 0 4px,transparent 4px 7px)" }}
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
              className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all duration-200 ${
                unit === u.value ? "bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[250px] flex-1 md:min-h-[290px]">
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
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tickFormatter={labelFor} axisLine={false} tickLine={false} minTickGap={28} dy={8} />
            <YAxis
              tickFormatter={(v: number) => formatKRW(v).replace("₩", "")}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as DailyPoint;
                const rows = [{ name: "매출", value: formatKRWExact(p.revenue), color: "#2563eb" }];
                if (p.prevRevenue != null)
                  rows.push({ name: "전 기간", value: formatKRWExact(p.prevRevenue), color: "#bfdbfe" });
                return <ChartTooltip label={unit === "month" ? String(label) : formatDateKR(String(label))} rows={rows} />;
              }}
            />
            {hasPrev && (
              <Area
                type="monotone"
                dataKey="prevRevenue"
                stroke="#bfdbfe"
                strokeWidth={1.8}
                strokeDasharray="5 4"
                fill="none"
                dot={false}
                animationDuration={600}
              />
            )}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#2563eb"
              strokeWidth={2.2}
              fill="url(#revFill)"
              dot={showDots ? { r: 3, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 1.5 } : false}
              activeDot={{ r: 5, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2.5 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className="animate-fade-in mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border border-line bg-surface-soft px-4 py-2.5 text-[12px]">
          <span className="font-semibold text-ink">
            {unit === "month" ? selected.date.replace("-", ".") : formatDateKR(selected.date)}
          </span>
          <span className="text-ink-soft">매출 <b className="text-ink">{formatKRWExact(selected.revenue)}</b></span>
          <span className="text-ink-soft">주문 <b className="text-ink">{selected.orders.toLocaleString("ko-KR")}건</b></span>
          <span className="text-ink-soft">전환율 <b className="text-ink">{selected.conversionRate}%</b></span>
          {selected.prevRevenue != null && (
            <span className="text-ink-soft">전 기간 <b className="text-ink">{formatKRWExact(selected.prevRevenue)}</b></span>
          )}
          <button onClick={() => setSelected(null)} className="ml-auto font-medium text-ink-dim hover:text-ink">닫기</button>
        </div>
      )}
    </div>
  );
}
