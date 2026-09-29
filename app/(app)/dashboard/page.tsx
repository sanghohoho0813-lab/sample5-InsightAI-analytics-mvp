"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import KpiStrip from "@/components/KpiStrip";
import AnomalyList from "@/components/AnomalyList";
import { InsightList } from "@/components/InsightList";
import DateLine from "@/components/DateLine";
import { Panel, PanelHeader } from "@/components/Panel";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ChannelDonut from "@/components/charts/ChannelDonut";
import { useApp } from "@/lib/store";
import { channelShares, filterDimensions, trendSeries } from "@/lib/analytics-engine";
import { computeForecasts } from "@/lib/forecast-engine";
import { reportSignature, scopeLabel, scopeOf, summarize } from "@/lib/report";
import { formatDateKR, formatKRW } from "@/lib/format";
import { MetricKey } from "@/lib/types";
import { SEVERITY_META, btn } from "@/lib/ui";

export default function DashboardPage() {
  const { dataset, filters, reports, saveReport, setFilters } = useApp();
  const [metric, setMetric] = useState<MetricKey>("revenue");

  const data = useMemo(() => {
    if (!dataset) return null;
    const forecast = computeForecasts(filterDimensions(dataset.rows, filters))[0];
    return {
      summary: summarize(dataset, filters),
      scope: scopeOf(dataset, filters),
      trend: trendSeries(dataset.rows, filters),
      shares: channelShares(dataset.rows, { ...filters, channel: "all" }),
      forecast,
      signature: reportSignature(dataset, filters),
    };
  }, [dataset, filters]);

  if (!dataset || !data) return <PageSkeleton />;

  const { summary, scope } = data;
  const saved = reports.find((r) => r.signature === data.signature);

  return (
    <>
      <PageHeader
        eyebrow={<DateLine className="text-meta text-ink-dim lg:hidden" showTime={false} />}
        title="대시보드"
        description={`${dataset.name} · ${scope.days}일 범위를 이전 같은 기간과 비교합니다.`}
        actions={
          saved ? (
            <Link href={`/reports?id=${saved.id}`} className={btn.secondary}>
              저장된 보고서 보기
            </Link>
          ) : (
            <button onClick={() => saveReport()} className={btn.primary}>
              이 범위를 보고서로 저장
            </button>
          )
        }
      />

      <FilterToolbar dataset={dataset} />

      {/* 1. 답 — 무엇이 변했나 → 왜 → 다음 행동 */}
      <Panel className="p-5 md:p-6" aria-labelledby="summary-title">
        <p className="text-meta text-ink-dim">{scopeLabel(scope)}</p>
        <h2 id="summary-title" className="mt-2 text-title font-bold tracking-tight text-ink">
          {summary.headline}
        </h2>
        <dl className="mt-5 grid gap-5 border-t border-line pt-5 md:grid-cols-3 md:gap-8">
          <div>
            <dt className="text-caption font-semibold text-ink-dim">왜 변했나</dt>
            <dd className="mt-1 text-body font-semibold text-ink">{summary.why?.title ?? "뚜렷한 요인 없음"}</dd>
            {summary.why && <dd className="mt-1 text-sub text-ink-soft">{summary.why.description}</dd>}
          </div>
          <div>
            <dt className="text-caption font-semibold text-ink-dim">확인이 필요한 변화</dt>
            {summary.alert ? (
              <>
                <dd className="mt-1 text-body font-semibold text-ink">
                  <span className={SEVERITY_META[summary.alert.severity].text}>
                    [{SEVERITY_META[summary.alert.severity].label}]
                  </span>{" "}
                  {summary.alert.title}
                </dd>
                <dd className="mt-1 text-sub text-ink-soft">
                  {formatDateKR(summary.alert.date)} · {summary.alert.description}
                </dd>
              </>
            ) : (
              <dd className="mt-1 text-sub text-ink-soft">이 범위에서는 주의가 필요한 변화가 없습니다.</dd>
            )}
          </div>
          <div>
            <dt className="text-caption font-semibold text-ink-dim">다음 행동</dt>
            <dd className="mt-1 text-body font-semibold text-ink">{summary.next?.title ?? "–"}</dd>
            {summary.next && <dd className="mt-1 text-sub text-ink-soft">{summary.next.description}</dd>}
          </div>
        </dl>
      </Panel>

      {/* 2. 핵심 지표 — 누르면 아래 추이 차트의 지표가 바뀐다 */}
      <div className="mt-6">
        <KpiStrip kpis={summary.kpis} selected={metric} onSelect={setMetric} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueTrendChart points={data.trend} metric={metric} />
        </div>
        <Panel>
          <PanelHeader
            title="확인이 필요한 변화"
            description="규칙: 전일 대비 ±30% 또는 7일 평균 대비 ±2σ"
            action={
              <Link href="/anomalies" className={btn.quiet}>
                전체 {summary.anomalies.length}건
              </Link>
            }
          />
          <div className="mt-2">
            <AnomalyList anomalies={summary.anomalies.slice(0, 4)} />
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader title="채널별 매출 비중" description="채널을 누르면 그 채널만 봅니다" />
          <ChannelDonut shares={data.shares} active={filters.channel} onSelect={(ch) => setFilters({ channel: ch })} />
        </Panel>

        <Panel className="xl:col-span-1">
          <PanelHeader
            title="주요 인사이트"
            action={
              <Link href="/insights" className={btn.quiet}>
                모두 보기
              </Link>
            }
          />
          <div className="mt-2">
            <InsightList insights={summary.insights.slice(0, 2)} compact />
          </div>
        </Panel>

        {data.forecast && (
          <Panel className="flex flex-col p-5 md:p-6 lg:col-span-2 xl:col-span-1">
            <h2 className="text-card font-bold text-ink">다음 7일 매출 예측</h2>
            <p className="mt-1 text-meta text-ink-dim">최근 14일 추세 기반 단순 모델 · 데모</p>
            <p className="tabular mt-4 text-kpi font-bold tracking-tight text-ink">
              {formatKRW(data.forecast.next7Total)}
            </p>
            <p className="mt-1 text-meta text-ink-soft">
              직전 7일보다{" "}
              <b className={`font-semibold ${data.forecast.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                {data.forecast.changePct >= 0 ? "+" : ""}
                {data.forecast.changePct.toFixed(1)}%
              </b>
            </p>
            <Link href="/forecast" className={`${btn.quiet} mt-auto pt-4`}>
              예측 자세히 보기 →
            </Link>
          </Panel>
        )}
      </div>
    </>
  );
}
