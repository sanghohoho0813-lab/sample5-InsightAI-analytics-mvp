"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import ForecastChart from "@/components/charts/ForecastChart";
import { filterDimensions } from "@/lib/analytics-engine";
import { useApp } from "@/lib/store";
import { computeForecasts, FORECAST_MIN_DAYS } from "@/lib/forecast-engine";
import Link from "next/link";
import { btn } from "@/lib/ui";
import { formatKRW, formatNumber } from "@/lib/format";
import { ForecastSummary } from "@/lib/types";

export default function ForecastPage() {
  const { ready, dataset, filters } = useApp();
  const [active, setActive] = useState<ForecastSummary["key"]>("revenue");

  const forecasts = useMemo(
    () => (dataset ? computeForecasts(filterDimensions(dataset.rows, filters)) : []),
    [dataset, filters]
  );

  if (!ready) return <PageSkeleton />;
  if (!dataset) {
    return (
      <>
        <PageHeader title="예측" />
        <EmptyState />
      </>
    );
  }
  if (forecasts.length === 0) {
    const days = new Set(dataset.rows.map((r) => r.date)).size;
    return (
      <>
        <PageHeader title="예측" />
        <Panel className="px-6 py-12 text-center">
          <p className="text-card font-bold text-ink">예측하려면 {FORECAST_MIN_DAYS}일 이상의 데이터가 필요합니다</p>
          <p className="mt-2 text-sub text-ink-soft">
            지금 데이터는 {days}일치입니다. 최근 7일과 그 앞 7일을 비교해 추세를 잡기 때문입니다.
          </p>
          <Link href="/data" className={`${btn.secondary} mt-6`}>
            다른 데이터 고르기
          </Link>
        </Panel>
      </>
    );
  }

  const current = forecasts.find((f) => f.key === active) ?? forecasts[0];
  const fmt = (v: number) => (current.format === "currency" ? formatKRW(v) : formatNumber(v));
  const future = current.points.filter((p) => p.value == null && p.forecast != null);
  const low = future.reduce((a, p) => a + (p.lower ?? 0), 0);
  const high = future.reduce((a, p) => a + (p.upper ?? 0), 0);

  return (
    <>
      <PageHeader
        title="예측"
        description="최근 14일 추세로 계산한 다음 7일 추정치"
      />
      <FilterToolbar dataset={dataset} showPeriod={false} />

      <Panel>
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 md:px-4" role="tablist" aria-label="예측 지표">
          {forecasts.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={active === f.key}
              onClick={() => setActive(f.key)}
              className={`relative min-h-12 whitespace-nowrap px-3 text-sub font-semibold transition-colors ${
                active === f.key ? "text-ink" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              {f.label}
              {active === f.key && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-brand" aria-hidden />}
            </button>
          ))}
        </div>

        <div className="grid gap-6 p-5 md:p-6 lg:grid-cols-[260px_1fr]">
          <div>
            <p className="text-meta text-ink-dim">다음 7일 {current.label} 합계</p>
            <p className="tabular mt-1 text-kpi font-bold tracking-tight text-ink">{fmt(current.next7Total)}</p>
            <p className="mt-1 text-meta text-ink-soft">
              직전 7일보다{" "}
              <b className={`font-semibold ${current.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                {current.changePct >= 0 ? "+" : ""}
                {current.changePct.toFixed(1)}%
              </b>
            </p>
            {low > 0 && high > 0 && (
              <p className="mt-4 text-meta text-ink-soft">
                예상 범위 <b className="tabular font-semibold text-ink">{fmt(low)} ~ {fmt(high)}</b>
              </p>
            )}
            <ul className="mt-4 space-y-1 text-meta text-ink-soft">
              <li className="flex items-center gap-2">
                <span className="h-[3px] w-4 rounded-full bg-brand" aria-hidden /> 실측
              </li>
              <li className="flex items-center gap-2">
                <span className="h-0 w-4 border-t-2 border-dashed border-accent" aria-hidden /> 예측
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-4 rounded-sm bg-accent/15" aria-hidden /> 예상 범위
              </li>
            </ul>
          </div>
          <ForecastChart summary={current} height={300} />
        </div>
      </Panel>

      <p className="mt-4 text-meta text-ink-dim">
        단순 추세 모델의 추정치입니다. 프로모션·시즌 요인은 반영하지 않으며, 예상 범위는 최근 변동폭으로 계산합니다.
      </p>
    </>
  );
}
