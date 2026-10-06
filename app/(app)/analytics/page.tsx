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
import { formatAxisKRW, formatKRW, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import { DerivedField, MetricKey } from "@/lib/types";
import { availableKpis, canSplit } from "@/lib/dataset-meta";
import { comparisonLabel } from "@/lib/report";
import Select from "@/components/Select";
import { DemoDataset } from "@/lib/types";

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

/** 분해 지표·차원 중 이 데이터로 실제 계산할 수 있는 것만 */
const NEEDS: Record<BreakMetric, DerivedField[]> = {
  revenue: [],
  orders: ["orders"],
  customers: ["customers"],
  conversionRate: ["orders", "visitors"],
  adSpend: ["adSpend"],
};
function usableMetrics(ds: DemoDataset) {
  return BREAK_METRICS.filter((m) => !NEEDS[m.value].some((f) => ds.derived?.includes(f)));
}
function usableDims(ds: DemoDataset) {
  return DIMENSIONS.filter((d) =>
    d.value === "customerType"
      ? !ds.derived?.includes("customers") && !ds.derived?.includes("returningCustomers")
      : canSplit(ds, d.value)
  );
}

function AnalyticsView() {
  const params = useSearchParams();
  const { ready, dataset, filters, setFilters } = useApp();
  const initial = params.get("metric") as MetricKey | null;
  const [picked, setPicked] = useState<MetricKey>(initial && METRIC_KEYS.includes(initial) ? initial : "revenue");
  const [dimChoice, setDimension] = useState<Dimension>("channel");
  const [metricChoice, setBreakMetric] = useState<BreakMetric>("revenue");
  const dims = dataset ? usableDims(dataset) : [];
  const metrics = dataset ? usableMetrics(dataset) : BREAK_METRICS;
  // 데이터를 바꿔 선택지가 사라졌으면 쓸 수 있는 첫 항목으로 돌아간다.
  const dimension = dims.some((d) => d.value === dimChoice) ? dimChoice : (dims[0]?.value ?? "channel");
  const breakMetric = metrics.some((m) => m.value === metricChoice) ? metricChoice : "revenue";

  // 인사이트·이상치에서 다른 지표로 다시 들어오면 그 지표를 연다.
  useEffect(() => {
    if (initial && METRIC_KEYS.includes(initial)) setPicked(initial);
  }, [initial]);

  const data = useMemo(() => {
    if (!dataset) return null;
    // 분해 차트는 해당 차원의 필터를 풀어 전체 항목을 보여주고, 선택된 항목만 강조한다.
    const breakFilters =
      dimension === "channel" ? { ...filters, channel: "all" } : dimension === "product" ? { ...filters, product: "all" } : filters;
    return {
      kpis: availableKpis(computeKpis(dataset.rows, filters), dataset),
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

  const metric = data.kpis.some((k) => k.key === picked) ? picked : "revenue";
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
        description={comparisonLabel(dataset, filters)}
      />
      <FilterToolbar dataset={dataset} />

      <KpiStrip kpis={data.kpis} selected={metric} onSelect={setPicked} />

      <div className="mt-6">
        <RevenueTrendChart points={data.trend} metric={metric} />
      </div>

      {dims.length > 0 && (
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
                {dims.map((d) => (
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
              <Select
                label="분해 지표"
                value={breakMetric}
                onChange={(v) => setBreakMetric(v as BreakMetric)}
                options={metrics}
                className="w-[132px]"
              />
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
                    tickFormatter={(v: number) => (isPct ? `${v}%` : isMoney ? formatAxisKRW(v) : formatNumber(v))}
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
      )}
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
