"use client";

import { useMemo } from "react";
import { AlertTriangle, LineChart, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ChannelDonut from "@/components/charts/ChannelDonut";
import AnomalyCard from "@/components/AnomalyCard";
import InsightCard from "@/components/InsightCard";
import ForecastCard from "@/components/ForecastCard";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import MobileHome from "@/components/MobileHome";
import { useApp } from "@/lib/store";
import { channelShares, computeKpis, filterDimensions, trendSeries } from "@/lib/analytics-engine";
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
      anomalies: detectAnomalies(dataset.rows, filters),
      insights: generateInsights({ rows: dataset.rows, filters }),
      forecasts: computeForecasts(filterDimensions(dataset.rows, filters)),
    };
  }, [dataset, filters]);

  if (!dataset || !data) {
    return (
      <>
        <PageHeader subtitle="데이터를 연결하면 AI 분석이 시작됩니다" />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      {/* 모바일 — 오늘의 비즈니스 요약 */}
      <MobileHome
        dataset={dataset}
        kpis={data.kpis}
        insights={data.insights}
        anomalies={data.anomalies}
        forecasts={data.forecasts}
      />

      {/* 데스크톱 — 고밀도 분석 대시보드 */}
      <div className="hidden lg:block">
        <PageHeader subtitle={`${dataset.name} · AI가 최근 ${filters.rangeDays}일을 분석했습니다`} />

        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
          {data.kpis.map((kpi, i) => (
            <MetricCard key={kpi.key} kpi={kpi} delay={i * 60} />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.65fr_1fr]">
          <RevenueTrendChart points={data.trend} />
          <ChannelDonut shares={data.shares} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section>
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
                data.anomalies.slice(0, 3).map((a, i) => <AnomalyCard key={a.id} anomaly={a} delay={i * 70} />)
              )}
            </div>
          </section>

          <section>
            <SectionHeader
              title="예측"
              href="/forecast"
              icon={<LineChart className="h-4 w-4 text-brand" />}
            />
            <div className="space-y-2.5">
              {data.forecasts.map((f, i) => (
                <ForecastCard key={f.key} summary={f} delay={i * 70} />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader
              title="AI 인사이트"
              href="/insights"
              icon={<Sparkles className="h-4 w-4 text-brand" />}
            />
            <div className="space-y-2.5">
              {data.insights.slice(0, 3).map((ins, i) => (
                <InsightCard key={ins.id} insight={ins} delay={i * 70} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
