"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import KpiStrip from "@/components/KpiStrip";
import { Panel, PanelHeader } from "@/components/Panel";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { useApp } from "@/lib/store";
import { computeKpis, exploreSeries, trendSeries } from "@/lib/analytics-engine";
import { formatKRW, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import { MetricKey } from "@/lib/types";
import { field } from "@/lib/ui";

type BreakMetric = "revenue" | "orders" | "customers" | "conversionRate" | "adSpend";
type Dimension = "channel" | "product" | "customerType";

const BREAK_METRICS: { value: BreakMetric; label: string }[] = [
  { value: "revenue", label: "매출" },
  { value: "orders", label: "주문 수" },
  { value: "customers", label: "고객 수" },
  { value: "conversionRate", label: "전환율" },
  { value: "adSpend", label: "광고비" },
];
const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "channel", label: "채널" },
  { value: "product", label: "상품" },
  { value: "customerType", label: "고객 유형" },
];
const METRIC_KEYS: MetricKey[] = ["revenue", "orders", "customers", "conversion", "aov"];

function AnalyticsView() {
  const params = useSearchParams();
  const { ready, dataset, filters, setFilters } = useApp();
  const initial = params.get("metric") as MetricKey | null;
  const [metric, setMetric] = useState<MetricKey>(initial && METRIC_KEYS.includes(initial) ? initial : "revenue");
  const [dimension, setDimension] = useState<Dimension>("channel");
  const [breakMetric, setBreakMetric] = useState<BreakMetric>("revenue");

  // 인사이트·이상치에서 다른 지표로 다시 들어오면 그 지표를 연다.
  useEffect(() => {
    if (initial && METRIC_KEYS.includes(initial)) setMetric(initial);
  }, [initial]);

  const data = useMemo(() => {
    if (!dataset) return null;
    // 분해 차트는 해당 차원의 필터를 풀어 전체 항목을 보여주고, 선택된 항목만 강조한다.
    const breakFilters =
      dimension === "channel" ? { ...filters, channel: "all" } : dimension === "product" ? { ...filters, product: "all" } : filters;
    return {
      kpis: computeKpis(dataset.rows, filters),
      trend: trendSeries(dataset.rows, filters),
      breakdown: exploreSeries(dataset.rows, breakFilters, breakMetric, dimension),
    };
  }, [dataset, filters, dimension, breakMetric]);

  if (!ready) return <PageSkeleton />;
  if (!dataset || !data) {
    return (
      <>
        <PageHeader title="분석" />
        <EmptyState />
      </>
    );
  }

  const isPct = breakMetric === "conversionRate";
  const isMoney = breakMetric === "revenue" || breakMetric === "adSpend";
  const fmt = (v: number) => (isPct ? `${v.toFixed(2)}%` : isMoney ? formatKRW(v) : formatNumber(v));
  const total = data.breakdown.reduce((a, s) => a + s.value, 0) || 1;
  const selectedName = dimension === "channel" ? filters.channel : dimension === "product" ? filters.product : "all";
  const canDrill = dimension !== "customerType";
  const estimated = dimension === "customerType" && !["customers", "orders"].includes(breakMetric);
  const unavailable = dimension === "customerType" && breakMetric === "conversionRate";

  const pick = (name: string) => {
    if (!canDrill) return;
    const next = selectedName === name ? "all" : name;
    setFilters(dimension === "channel" ? { channel: next } : { product: next });
  };

  return (
    <>
      <PageHeader
        title="분석"
        description="지표를 고르면 추이가 바뀌고, 채널·상품 막대를 누르면 그 항목으로 범위가 좁혀집니다."
      />
      <FilterToolbar dataset={dataset} />

      <KpiStrip kpis={data.kpis} selected={metric} onSelect={setMetric} />

      <div className="mt-6">
        <RevenueTrendChart points={data.trend} metric={metric} />
      </div>

      <Panel className="mt-6" aria-labelledby="breakdown-title">
        <PanelHeader
          id="breakdown-title"
          title={`${DIMENSIONS.find((d) => d.value === dimension)!.label}별 ${BREAK_METRICS.find((m) => m.value === breakMetric)!.label}`}
          description={
            unavailable
              ? "고객 유형별 전환율은 원본 데이터에 없어 계산하지 않습니다."
              : estimated
                ? "고객 유형별 금액은 고객 수 비율로 나눈 추정치입니다."
                : canDrill
                  ? "행을 누르면 그 항목으로 범위를 좁히고, 다시 누르면 해제됩니다."
                  : undefined
          }
          action={
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-control border border-line bg-surface-soft p-0.5" role="group" aria-label="분해 기준">
                {DIMENSIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDimension(d.value)}
                    aria-pressed={dimension === d.value}
                    className={`min-h-10 rounded-[8px] px-3 text-meta font-semibold transition-colors ${
                      dimension === d.value ? "bg-surface text-ink shadow-subtle" : "text-ink-dim hover:text-ink-soft"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <select
                value={breakMetric}
                onChange={(e) => setBreakMetric(e.target.value as BreakMetric)}
                aria-label="분해 지표"
                className={field}
              >
                {BREAK_METRICS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          }
        />

        {unavailable ? (
          <p className="px-5 py-10 text-center text-sub text-ink-dim md:px-6">다른 지표를 선택해주세요.</p>
        ) : (
          <div className="grid gap-2 p-5 md:p-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
            <div className="h-[240px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.breakdown} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => (isPct ? `${v}%` : isMoney ? formatKRW(v).replace("₩", "") : formatNumber(v))}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={96} />
                  <Tooltip
                    cursor={{ fill: COLORS.brandSoft }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <ChartTooltip rows={[{ name: String(payload[0].payload.name), value: fmt(Number(payload[0].value)), color: COLORS.brand }]} />
                      ) : null
                    }
                  />
                  <Bar
                    dataKey="value"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={22}
                    animationDuration={500}
                    onClick={(d: { name?: string }) => d?.name && pick(d.name)}
                    className={canDrill ? "cursor-pointer" : ""}
                  >
                    {data.breakdown.map((b) => (
                      <Cell
                        key={b.name}
                        fill={selectedName === "all" || selectedName === b.name ? COLORS.brand : "#c5d6f2"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-sub">
              <thead>
                <tr className="border-b border-line text-left text-caption text-ink-dim">
                  <th className="py-2 font-semibold">{DIMENSIONS.find((d) => d.value === dimension)!.label}</th>
                  <th className="py-2 text-right font-semibold">값</th>
                  <th className="py-2 text-right font-semibold">비중</th>
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((b) => {
                  const on = selectedName === b.name;
                  return (
                    <tr
                      key={b.name}
                      onClick={() => pick(b.name)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick(b.name))}
                      tabIndex={canDrill ? 0 : undefined}
                      aria-selected={canDrill ? on : undefined}
                      className={`border-b border-line/70 last:border-0 ${canDrill ? "cursor-pointer hover:bg-surface-soft" : ""} ${on ? "bg-brand-soft/60" : ""}`}
                    >
                      <td className={`py-3 pr-2 ${on ? "font-semibold text-brand" : "text-ink"}`}>{b.name}</td>
                      <td className="tabular py-3 text-right font-semibold text-ink">{fmt(b.value)}</td>
                      <td className="tabular py-3 pl-2 text-right text-ink-soft">
                        {isPct ? "–" : `${((b.value / total) * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnalyticsView />
    </Suspense>
  );
}
