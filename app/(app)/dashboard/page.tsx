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
import ForecastChart from "@/components/charts/ForecastChart";
import { useApp } from "@/lib/store";
import { useDrill } from "@/lib/drill";
import { channelShares, filterDimensions, trendSeries } from "@/lib/analytics-engine";
import { ANOMALY_MIN_DAYS } from "@/lib/anomaly-engine";
import { computeForecasts, FORECAST_MIN_DAYS } from "@/lib/forecast-engine";
import { canSplit } from "@/lib/dataset-meta";
import { comparisonLabel, reportSignature, summarize } from "@/lib/report";
import { formatDateKR, formatKRW } from "@/lib/format";
import { MetricKey } from "@/lib/types";
import { SEVERITY_META, btn } from "@/lib/ui";

const action = "mt-2 inline-flex min-h-11 items-center text-sub font-semibold text-brand hover:text-brand-dark";

export default function DashboardPage() {
  const { dataset, filters, reports, saveReport, setFilters } = useApp();
  const { toSegment, toMoment } = useDrill();
  const [picked, setPicked] = useState<MetricKey>("revenue");

  const data = useMemo(() => {
    if (!dataset) return null;
    const summary = summarize(dataset, filters);
    return {
      summary,
      comparison: comparisonLabel(dataset, filters),
      trend: trendSeries(dataset.rows, filters),
      shares: canSplit(dataset, "channel") ? channelShares(dataset.rows, { ...filters, channel: "all" }) : [],
      forecast: computeForecasts(filterDimensions(dataset.rows, filters))[0],
      dataDays: new Set(dataset.rows.map((r) => r.date)).size,
      signature: reportSignature(dataset, filters),
    };
  }, [dataset, filters]);

  if (!dataset || !data) return <PageSkeleton />;

  const { summary } = data;
  const saved = reports.find((r) => r.signature === data.signature);
  // 지표를 고른 뒤 그 지표가 없는 데이터로 바꾸면 매출로 돌아간다.
  const metric = summary.kpis.some((k) => k.key === picked) ? picked : "revenue";
  // 요약의 '왜'와 같은 내용을 인사이트 목록에서 다시 보여주지 않는다.
  const insights = summary.insights
    .filter((i) => i.title !== summary.why?.title && !(i.id === "channel-mix" && summary.why?.drill?.channel))
    .slice(0, 2);

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
        description={data.comparison}
        actions={<div className="hidden md:flex">{saveAction}</div>}
      />

      <FilterToolbar dataset={dataset} />

      {/* 1. 답 — 무엇이 변했나 → 왜 → 지금 확인할 것 → 다음 행동 */}
      <Panel className="p-5 md:p-6" aria-labelledby="summary-title">
        <h2 id="summary-title" className="text-title font-bold tracking-tight text-ink">
          {summary.headline}
        </h2>
        <dl className="mt-5 grid gap-6 border-t border-line pt-5 md:grid-cols-3 md:gap-8">
          <div>
            <dt className="text-caption font-semibold text-ink-dim">왜 변했나</dt>
            <dd className="mt-1 text-body font-semibold text-ink">{summary.why?.title ?? "뚜렷한 요인 없음"}</dd>
            {summary.why && <dd className="mt-1 text-sub text-ink-soft">{summary.why.description}</dd>}
            {summary.why?.drill && (
              <dd>
                <button onClick={() => toSegment(summary.why!.drill!, summary.why!.title)} className={action}>
                  {summary.why.drill.channel ?? summary.why.drill.product}만 보기 →
                </button>
              </dd>
            )}
          </div>
          <div>
            <dt className="text-caption font-semibold text-ink-dim">확인이 필요한 변화</dt>
            {summary.alert ? (
              <>
                <dd className="mt-1 text-body font-semibold text-ink">
                  <span className={SEVERITY_META[summary.alert.severity].text}>
                    {SEVERITY_META[summary.alert.severity].label}
                  </span>{" "}
                  · {summary.alert.title}
                </dd>
                <dd className="mt-1 text-sub text-ink-soft">
                  {formatDateKR(summary.alert.date)} · {summary.alert.description}
                </dd>
                <dd>
                  <button
                    onClick={() => toMoment(summary.alert!.date, summary.alert!.channel, summary.alert!.metricKey, summary.alert!.title)}
                    className={action}
                  >
                    그날 전후 분석 보기 →
                  </button>
                </dd>
              </>
            ) : (
              <dd className="mt-1 text-sub text-ink-soft">
                {data.dataDays < ANOMALY_MIN_DAYS
                  ? `급증·급감을 찾으려면 ${ANOMALY_MIN_DAYS}일 이상의 데이터가 필요합니다.`
                  : "이 범위에서는 주의가 필요한 변화가 없습니다."}
              </dd>
            )}
          </div>
          <div>
            <dt className="text-caption font-semibold text-ink-dim">다음 행동</dt>
            {summary.next ? (
              <>
                <dd className="mt-1 text-body font-semibold text-ink">{summary.next.title}</dd>
                <dd className="mt-1 text-sub text-ink-soft">{summary.next.description}</dd>
                <dd>
                  <Link href="/insights" className={action}>
                    실행 제안 모두 보기 →
                  </Link>
                </dd>
              </>
            ) : (
              <>
                <dd className="mt-1 text-body font-semibold text-ink">데이터를 조금 더 넣어보세요</dd>
                <dd className="mt-1 text-sub text-ink-soft">
                  주문 수·채널·상품 컬럼이 있거나 기간이 길면 원인과 실행 제안까지 계산합니다.
                </dd>
                <dd>
                  <Link href="/data" className={action}>
                    파일 다시 올리기 →
                  </Link>
                </dd>
              </>
            )}
          </div>
        </dl>
      </Panel>

      {/* 모바일에서는 요약을 읽은 다음에 저장 버튼이 오도록 */}
      <div className="mt-4 md:hidden [&>*]:w-full">{saveAction}</div>

      {/* 2. 핵심 지표 — 누르면 아래 추이 차트의 지표가 바뀐다 */}
      <div className="mt-6">
        <KpiStrip kpis={summary.kpis} selected={metric} onSelect={setPicked} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RevenueTrendChart points={data.trend} metric={metric} />
        </div>
        <Panel>
          <PanelHeader
            title="확인이 필요한 변화"
            action={
              summary.anomalies.length > 4 ? (
                <Link href="/anomalies" className={btn.quiet}>
                  전체 {summary.anomalies.length}건
                </Link>
              ) : undefined
            }
          />
          <div className="mt-2">
            <AnomalyList
              anomalies={summary.anomalies.slice(0, 4)}
              empty={
                data.dataDays < ANOMALY_MIN_DAYS
                  ? `급증·급감을 찾으려면 ${ANOMALY_MIN_DAYS}일 이상의 데이터가 필요합니다.`
                  : "이 범위에서는 확인이 필요한 변화가 없습니다."
              }
            />
          </div>
        </Panel>
      </div>

      <div className={`mt-6 grid gap-6 lg:grid-cols-2 ${data.shares.length ? "xl:grid-cols-3" : ""}`}>
        {data.shares.length > 0 && (
          <Panel>
            <PanelHeader title="채널별 매출 비중" description="채널을 누르면 그 채널만 봅니다" />
            <ChannelDonut shares={data.shares} active={filters.channel} onSelect={(ch) => setFilters({ channel: ch })} />
          </Panel>
        )}

        <Panel>
          <PanelHeader
            title="주요 인사이트"
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

        <Panel className={`flex flex-col p-5 md:p-6 ${data.shares.length ? "lg:col-span-2 xl:col-span-1" : ""}`}>
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
    </>
  );
}
