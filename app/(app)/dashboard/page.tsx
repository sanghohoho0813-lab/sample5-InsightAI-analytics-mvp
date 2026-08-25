"use client";

import { useMemo } from "react";
import { AlertTriangle, LineChart, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import MetricCard from "@/components/MetricCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ChannelDonut from "@/components/charts/ChannelDonut";
import AnomalyCard from "@/components/AnomalyCard";
import InsightCard from "@/components/InsightCard";
import ForecastCard from "@/components/ForecastCard";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/lib/store";
import { channelShares, computeKpis, trendSeries } from "@/lib/analytics-engine";
import { detectAnomalies } from "@/lib/anomaly-engine";
import { computeForecasts } from "@/lib/forecast-engine";
import { generateInsights } from "@/lib/insight-generator";

export default function DashboardPage() {
  const { dataset, filters } = useApp();

  const data = useMemo(() => {
    if (!dataset) return null;
    return {
      kpis: computeKpis(dataset.rows, filters),
      trend: trendSeries(dataset.rows, filters),
      shares: channelShares(dataset.rows, filters),
      anomalies: detectAnomalies(dataset.rows, filters.rangeDays).slice(0, 3),
      insights: generateInsights({ rows: dataset.rows, rangeDays: filters.rangeDays }).slice(0, 3),
      forecasts: computeForecasts(dataset.rows),
    };
  }, [dataset, filters]);

  if (!dataset || !data) {
    return (
      <>
        <PageHeader title="홈 대시보드" subtitle="데이터를 연결하면 AI 분석이 시작됩니다" />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="홈 대시보드"
        subtitle={`${dataset.name} · AI가 최근 ${filters.rangeDays}일을 분석했습니다`}
        showReportCta
      />
      <FilterBar dataset={dataset} />

      {/* 모바일에서는 KPI → 인사이트/이상징후/예측 → 상세 차트 순으로 우선순위 배치 */}
      <div className="flex flex-col gap-4">
        <div className="order-1 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {data.kpis.map((kpi, i) => (
            <MetricCard key={kpi.key} kpi={kpi} delay={i * 60} />
          ))}
        </div>

        {/* 추이 + 채널 비중 */}
        <div className="order-3 grid grid-cols-1 gap-4 lg:order-2 xl:grid-cols-[1.6fr_1fr]">
          <RevenueTrendChart points={data.trend} />
          <ChannelDonut shares={data.shares} />
        </div>

        {/* 이상징후 / 예측 / 인사이트 */}
        <div className="order-2 grid grid-cols-1 gap-4 lg:order-3 lg:grid-cols-3">
          <section className="order-2 lg:order-1">
            <SectionHeader
              title="이상 징후 감지"
              href="/anomalies"
              icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            />
            <div className="space-y-2.5">
              {data.anomalies.length === 0 ? (
                <div className="card p-5 text-center text-[12.5px] text-ink-dim">
                  이 기간에는 특이한 변화가 감지되지 않았습니다.
                </div>
              ) : (
                data.anomalies.map((a, i) => <AnomalyCard key={a.id} anomaly={a} delay={i * 70} />)
              )}
            </div>
          </section>

          <section className="order-3 lg:order-2">
            <SectionHeader
              title="예측"
              href="/forecast"
              icon={<LineChart className="h-4 w-4 text-cyan-accent" />}
            />
            <div className="space-y-2.5">
              {data.forecasts.map((f, i) => (
                <ForecastCard key={f.key} summary={f} delay={i * 70} />
              ))}
            </div>
          </section>

          <section className="order-1 lg:order-3">
            <SectionHeader
              title="AI 인사이트"
              href="/insights"
              icon={<Sparkles className="h-4 w-4 text-accent-bright" />}
            />
            <div className="space-y-2.5">
              {data.insights.map((ins, i) => (
                <InsightCard key={ins.id} insight={ins} delay={i * 70} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
