"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import BriefingPanel from "@/components/BriefingPanel";
import ReadingGuide from "@/components/ReadingGuide";
import MetricTabs from "@/components/MetricTabs";
import AnomalyList from "@/components/AnomalyList";
import ContributionBars from "@/components/ContributionBars";
import { InsightList } from "@/components/InsightList";
import DateLine from "@/components/DateLine";
import { Panel, PanelHeader } from "@/components/Panel";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ForecastChart from "@/components/charts/ForecastChart";
import { useApp } from "@/lib/store";
import { filterDimensions, trendSeries } from "@/lib/analytics-engine";
import { ANOMALY_MIN_DAYS } from "@/lib/anomaly-engine";
import { contributions, driverDim } from "@/lib/drivers";
import { computeForecasts, FORECAST_MIN_DAYS } from "@/lib/forecast-engine";
import { canSplit } from "@/lib/dataset-meta";
import { reportSignature, summarize } from "@/lib/report";
import { formatDateKR, formatKRW, formatMonthDay } from "@/lib/format";
import { MetricKey } from "@/lib/types";
import { btn } from "@/lib/ui";

export default function DashboardPage() {
  const { dataset, filters, reports, saveReport, setFilters, readIds, markRead } = useApp();
  const [picked, setPicked] = useState<MetricKey>("revenue");

  const data = useMemo(() => {
    if (!dataset) return null;
    const brief = summarize(dataset, filters);
    const dim = driverDim(filters, (d) => canSplit(dataset, d));
    return {
      brief,
      trend: trendSeries(dataset.rows, filters),
      split: dim ? contributions(dataset.rows, filters, dim) : null,
      forecast: computeForecasts(filterDimensions(dataset.rows, filters))[0],
      dataDays: new Set(dataset.rows.map((r) => r.date)).size,
      lastDate: dataset.rows.reduce((m, r) => (r.date > m ? r.date : m), ""),
      signature: reportSignature(dataset, filters),
    };
  }, [dataset, filters]);

  if (!dataset || !data) return <PageSkeleton />;

  const { brief } = data;
  const saved = reports.find((r) => r.signature === data.signature);
  // 지표를 고른 뒤 그 지표가 없는 데이터로 바꾸면 매출로 돌아간다.
  const metric = brief.kpis.some((k) => k.key === picked) ? picked : "revenue";
  // 브리핑에서 이미 말한 내용(가장 큰 변화·위험)은 인사이트 목록에서 다시 보여주지 않는다.
  const shown = new Set([brief.change?.title, brief.risk?.title]);
  const insights = brief.insights.filter((i) => i.id !== "driver" && !shown.has(i.title)).slice(0, 3);
  const currentDates = data.trend.map((p) => p.date);
  const period = `${formatDateKR(currentDates[0] ?? "").slice(5)} ~ ${formatDateKR(currentDates[currentDates.length - 1] ?? "").slice(5)} · ${
    brief.comparable ? `이전 ${currentDates.length}일과 비교` : "비교할 이전 기간 없음"
  }`;
  const anomalyEmpty =
    data.dataDays < ANOMALY_MIN_DAYS
      ? `급변을 찾으려면 ${ANOMALY_MIN_DAYS}일 이상의 데이터가 필요합니다.`
      : "이 범위에서는 평소와 크게 다른 날이 없었습니다.";

  const saveAction = saved ? (
    <Link href={`/reports?id=${saved.id}`} className={btn.secondary}>
      저장된 보고서 보기
    </Link>
  ) : (
    <button onClick={() => saveReport()} className={btn.primary}>
      보고서로 저장
    </button>
  );

  return (
    <>
      <PageHeader
        eyebrow={<DateLine className="text-meta text-ink-dim lg:hidden" showTime={false} />}
        title="대시보드"
        description={
          <>
            <span className="hidden sm:inline">{dataset.name} · </span>마지막 데이터 {formatMonthDay(data.lastDate)}
          </>
        }
        actions={<div className="hidden md:flex">{saveAction}</div>}
      />

      <FilterToolbar dataset={dataset} />
      <ReadingGuide />

      {/* 범위를 바꾸면 결과가 새로 계산되었음을 짧은 전환으로 알린다 */}
      <div key={data.signature} className="animate-fade-in">
      {/* 1. 경영 브리핑 — 무엇이 변했나 → 왜 → 위험 → 다음 행동 */}
      <BriefingPanel b={brief} period={period} derived={dataset.derived} trend={data.trend.map((p) => p.revenue)} />

      {/* 모바일에서는 요약을 읽은 다음에 저장 버튼이 오도록 */}
      <div className="mt-4 md:hidden [&>*]:w-full">{saveAction}</div>

      {/* 2. 지표 흐름 + 평소와 달랐던 날 */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueTrendChart
            points={data.trend}
            metric={metric}
            header={<MetricTabs kpis={brief.kpis} selected={metric} onSelect={setPicked} />}
            markers={brief.anomalies.map((a) => ({ id: a.id, date: a.metrics[0]?.date ?? a.date, title: a.title, down: a.direction === "down" }))}
          />
        </div>
        <Panel>
          <PanelHeader
            title="평소와 달랐던 날"
            description="누르면 원인 조사 화면으로 갑니다"
            action={
              brief.anomalies.length > 5 ? (
                <Link href="/anomalies" className={btn.quiet}>
                  전체 {brief.anomalies.length}건
                </Link>
              ) : undefined
            }
          />
          <div className="mt-2">
            <AnomalyList
              anomalies={brief.anomalies.slice(0, 5)}
              unreadIds={new Set(brief.anomalies.filter((a) => a.severity !== "info" && !readIds.includes(a.id)).map((a) => a.id))}
              onRead={(id) => markRead([id])}
              empty={anomalyEmpty}
            />
          </div>
        </Panel>
      </div>

      {/* 3. 어디서 변했나 · 그 밖의 발견 · 다음 7일 */}
      <div className={`mt-6 grid gap-6 lg:grid-cols-2 ${data.split ? "xl:grid-cols-3" : ""}`}>
        {data.split && (
          <Panel>
            <PanelHeader
              title={`${data.split.dim === "channel" ? "채널" : "상품"}별 ${brief.comparable ? "매출 변화" : "매출 비중"}`}
              description={
                brief.comparable
                  ? `이전 ${currentDates.length}일 대비 증감액 · 누르면 그 ${data.split.dim === "channel" ? "채널" : "상품"}만 봅니다`
                  : `누르면 그 ${data.split.dim === "channel" ? "채널" : "상품"}만 봅니다`
              }
            />
            <div className="px-3 pb-4 pt-3 md:px-4">
              <ContributionBars
                items={data.split.items}
                comparable={brief.comparable}
                active={data.split.dim === "channel" ? filters.channel : filters.product}
                onSelect={(name) => setFilters(data.split!.dim === "channel" ? { channel: name } : { product: name })}
              />
            </div>
          </Panel>
        )}

        <Panel>
          <PanelHeader
            title="그 밖의 발견"
            action={
              <Link href="/insights" className={btn.quiet}>
                모두 보기
              </Link>
            }
          />
          <div className="mt-2">
            <InsightList insights={insights} compact />
          </div>
        </Panel>

        <Panel className={`flex flex-col p-5 md:p-6 ${data.split ? "lg:col-span-2 xl:col-span-1" : ""}`}>
          <h2 className="text-card font-bold text-ink">다음 7일 매출 예측</h2>
          {data.forecast ? (
            <>
              <p className="tabular mt-3 text-kpi font-bold tracking-tight text-ink">{formatKRW(data.forecast.next7Total)}</p>
              <p className="mt-1 text-meta text-ink-soft">
                직전 7일보다{" "}
                <b className={`font-semibold ${data.forecast.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                  {data.forecast.changePct >= 0 ? "+" : ""}
                  {data.forecast.changePct.toFixed(1)}%
                </b>
                <span className="text-ink-dim"> · 추세 기반 추정치</span>
              </p>
              <div className="mt-4 flex-1">
                <ForecastChart summary={data.forecast} height={150} compact />
              </div>
              <Link href="/forecast" className={`${btn.quiet} mt-2`}>
                예측 자세히 보기 →
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sub text-ink-soft">
              예측하려면 {FORECAST_MIN_DAYS}일 이상의 데이터가 필요합니다. 지금 데이터는 {data.dataDays}일치입니다.
            </p>
          )}
        </Panel>
      </div>
      </div>
    </>
  );
}
