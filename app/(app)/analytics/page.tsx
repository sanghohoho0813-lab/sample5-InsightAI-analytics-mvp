"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatDateKR, josa } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import MetricTabs from "@/components/MetricTabs";
import { Panel, PanelHeader } from "@/components/Panel";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import BreakdownTable from "@/components/BreakdownTable";
import { useApp } from "@/lib/store";
import { breakdownRows, computeKpis, trendSeries } from "@/lib/analytics-engine";
import { formatKRW, formatNumber } from "@/lib/format";
import { DerivedField, MetricKey } from "@/lib/types";
import { anomaliesFor, availableKpis, canSplit } from "@/lib/dataset-meta";
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
  const { ready, dataset, filters, setFilters, drill } = useApp();
  const router = useRouter();
  // 드릴로 들어온 직후의 범위 — 사용자가 범위를 바꾸면 제목을 일반 '분석'으로 되돌린다.
  const [arrived] = useState(() => JSON.stringify(filters));
  const focused = drill && JSON.stringify(filters) === arrived ? drill : null;
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
      anomalies: anomaliesFor(dataset, filters),
      trend: trendSeries(dataset.rows, filters),
      breakdown: breakdownRows(dataset.rows, breakFilters, breakMetric, dimension),
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
      {drill && (
        <button
          onClick={() => router.push(drill.from)}
          className="mb-4 inline-flex min-h-11 items-center gap-1 text-sub font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {josa(drill.fromLabel, "으로")} 돌아가기
        </button>
      )}
      <PageHeader
        title={focused ? focused.label : "분석"}
        description={
          focused?.date
            ? `${formatDateKR(focused.date)} 전후 · ${comparisonLabel(dataset, filters)}`
            : comparisonLabel(dataset, filters)
        }
      />
      <FilterToolbar dataset={dataset} />

      <RevenueTrendChart
        points={data.trend}
        metric={metric}
        markDate={focused?.date}
        header={<MetricTabs kpis={data.kpis} selected={metric} onSelect={setPicked} />}
        markers={data.anomalies.map((a) => ({ id: a.id, date: a.metrics[0]?.date ?? a.date, title: a.title, down: a.direction === "down" }))}
      />

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
                  ? "이름을 누르면 그 항목으로 범위를 좁히고, 다시 누르면 해제됩니다 · 열 머리로 정렬"
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
          <div className="px-5 pb-3 pt-2 md:px-6">
            <BreakdownTable
              rows={data.breakdown}
              dimLabel={DIMENSIONS.find((d) => d.value === dimension)!.label}
              fmt={fmt}
              rate={isPct}
              neutralChange={breakMetric === "adSpend"}
              selected={selectedName}
              onPick={canDrill ? pick : undefined}
            />
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
