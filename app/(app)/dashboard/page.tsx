"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, LineChart, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import MetricCard from "@/components/MetricCard";
import RevenueTrendChart, { TrendMetric } from "@/components/charts/RevenueTrendChart";
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
  const { dataset, filters, seedDemoDataset } = useApp();
  const [metric, setMetric] = useState<TrendMetric>("revenue");

  // 루트 도메인이 대시보드로 연결되므로, 첫 방문에도 화면이 비어 있지 않게 한다.
  useEffect(() => {
    if (!dataset) seedDemoDataset();
  }, [dataset, seedDemoDataset]);

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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {data.kpis.map((kpi, i) => (
            <MetricCard
              key={kpi.key}
              kpi={kpi}
              delay={i * 60}
              selected={metric === kpi.key}
              onSelect={() => setMetric(kpi.key as TrendMetric)}
            />
          ))}
          {/* 3열 배치에서 남는 칸을 AI 한 줄 요약으로 채운다 (5열에서는 숨김) */}
          {data.insights[0] && (
            <Link
              href="/insights"
              className="card card-hover animate-fade-up flex flex-col justify-center gap-2 bg-brand-soft/60 p-5 2xl:hidden"
              style={{ animationDelay: "300ms" }}
            >
              <span className="flex items-center gap-2 text-[17px] font-bold text-brand">
                <Sparkles className="h-6 w-6" />
                AI 한 줄 요약
              </span>
              <span className="text-[19px] font-semibold leading-relaxed text-ink">
                {data.insights[0].description}
              </span>
              <span className="flex items-center gap-1 text-[16px] font-semibold text-brand">
                인사이트 전체 보기 <ArrowRight className="h-5 w-5" />
              </span>
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 2xl:grid-cols-[1.6fr_1fr]">
          <RevenueTrendChart points={data.trend} metric={metric} />
          <ChannelDonut shares={data.shares} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section>
            <SectionHeader
              title="이상 징후 감지"
              href="/anomalies"
              icon={<AlertTriangle className="h-6 w-6 text-warning" />}
            />
            <div className="space-y-2.5">
              {data.anomalies.length === 0 ? (
                <div className="card p-5 text-center text-[19px] text-ink-dim">
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
              icon={<LineChart className="h-6 w-6 text-brand" />}
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
              icon={<Sparkles className="h-6 w-6 text-brand" />}
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
