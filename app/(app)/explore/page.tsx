"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { useApp } from "@/lib/store";
import { exploreSeries } from "@/lib/analytics-engine";
import { formatDateKR, formatDateShort, formatKRW, formatNumber } from "@/lib/format";

type Metric = "revenue" | "orders" | "customers" | "conversionRate" | "adSpend";
type Dimension = "date" | "channel" | "product" | "customerType";

const METRICS: { value: Metric; label: string }[] = [
  { value: "revenue", label: "매출" },
  { value: "orders", label: "주문" },
  { value: "customers", label: "고객" },
  { value: "conversionRate", label: "전환율" },
  { value: "adSpend", label: "광고비" },
];
const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "date", label: "기간" },
  { value: "channel", label: "채널" },
  { value: "product", label: "상품" },
  { value: "customerType", label: "고객 유형" },
];

export default function ExplorePage() {
  const { dataset, filters } = useApp();
  const [metric, setMetric] = useState<Metric>("revenue");
  const [dimension, setDimension] = useState<Dimension>("date");

  const series = useMemo(() => {
    if (!dataset) return [];
    return exploreSeries(dataset.rows, filters, metric, dimension);
  }, [dataset, filters, metric, dimension]);

  if (!dataset) {
    return (
      <>
        <PageHeader subtitle="지표와 차원을 조합해 데이터를 직접 살펴보세요" />
        <EmptyState />
      </>
    );
  }

  const isPct = metric === "conversionRate";
  const isMoney = metric === "revenue" || metric === "adSpend";
  const fmt = (v: number) => (isPct ? `${v}%` : isMoney ? formatKRW(v) : formatNumber(v));
  const axisFmt = (v: number) => (isPct ? `${v}%` : isMoney ? formatKRW(v).replace("₩", "") : formatNumber(v));
  const metricLabel = METRICS.find((m) => m.value === metric)!.label;

  const chipCls = (on: boolean) =>
    `rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all duration-200 ${
      on ? "bg-brand text-white shadow-md shadow-brand/25" : "border border-line bg-surface-soft text-ink-dim hover:text-ink-soft"
    }`;

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · 지표 × 차원 조합으로 살펴보기`} />
      <FilterBar dataset={dataset} />

      <div className="card animate-fade-up p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-dim">Metric</p>
            <div className="flex flex-wrap gap-1.5">
              {METRICS.map((m) => (
                <button key={m.value} onClick={() => setMetric(m.value)} className={chipCls(metric === m.value)}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-dim">Dimension</p>
            <div className="flex flex-wrap gap-1.5">
              {DIMENSIONS.map((d) => (
                <button key={d.value} onClick={() => setDimension(d.value)} className={chipCls(dimension === d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            {dimension === "date" ? (
              <AreaChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="exploreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#122544" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="name" tickFormatter={formatDateShort} axisLine={false} tickLine={false} minTickGap={28} dy={6} />
                <YAxis tickFormatter={axisFmt} axisLine={false} tickLine={false} width={58} domain={["auto", "auto"]} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.length ? (
                      <ChartTooltip label={formatDateKR(String(label))} rows={[{ name: metricLabel, value: fmt(Number(payload[0].value)), color: "#3b82f6" }]} />
                    ) : null
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2.2}
                  fill="url(#exploreFill)"
                  dot={false}
                  activeDot={{ r: 4.5, fill: "#60a5fa", stroke: "#0a1628", strokeWidth: 2 }}
                  animationDuration={600}
                />
              </AreaChart>
            ) : (
              <BarChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#122544" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={6} />
                <YAxis tickFormatter={axisFmt} axisLine={false} tickLine={false} width={58} />
                <Tooltip
                  cursor={{ fill: "#122544", opacity: 0.4 }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltip rows={[{ name: String(payload[0].payload.name), value: fmt(Number(payload[0].value)), color: "#22d3ee" }]} />
                    ) : null
                  }
                />
                <Bar dataKey="value" fill="#22d3ee" radius={[6, 6, 0, 0]} maxBarSize={48} animationDuration={600} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {dimension !== "date" && (
        <div className="mt-4 card animate-fade-up overflow-x-auto p-4">
          <table className="w-full min-w-[420px] text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-ink-dim">
                <th className="px-3 py-2 font-medium">{DIMENSIONS.find((d) => d.value === dimension)!.label}</th>
                <th className="px-3 py-2 text-right font-medium">{metricLabel}</th>
                <th className="px-3 py-2 text-right font-medium">비중</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const total = series.reduce((a, s) => a + s.value, 0) || 1;
                return series.map((s) => (
                  <tr key={s.name} className="border-b border-line/60 last:border-0 hover:bg-surface-soft">
                    <td className="px-3 py-2.5">{s.name}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{fmt(s.value)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ink-soft">{isPct ? "—" : `${((s.value / total) * 100).toFixed(1)}%`}</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
