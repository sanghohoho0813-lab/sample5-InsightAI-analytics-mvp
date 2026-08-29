"use client";

import Link from "next/link";
import { AlertOctagon, AlertTriangle, Bell, ChevronRight, Sparkles } from "lucide-react";
import { Anomaly, DemoDataset, ForecastSummary, Insight, KpiResult } from "@/lib/types";
import { formatDateKR, formatValue } from "@/lib/format";
import DateRangePicker from "./DateRangePicker";
import NotificationBell from "./NotificationBell";
import LiveClock from "./LiveClock";
import InsightCarousel from "./InsightCarousel";
import Sparkline from "./Sparkline";
import ForecastCard from "./ForecastCard";
import SectionHeader from "./SectionHeader";
import { MiraeWordmark } from "./MiraeLogo";
import { BRAND } from "@/lib/brand";

/** 모바일 홈 — '오늘의 비즈니스 요약' (첨부 디자인의 모바일 화면 구성) */
export default function MobileHome({
  dataset,
  kpis,
  insights,
  anomalies,
  forecasts,
}: {
  dataset: DemoDataset;
  kpis: KpiResult[];
  insights: Insight[];
  anomalies: Anomaly[];
  forecasts: ForecastSummary[];
}) {
  const topKpis = kpis.filter((k) => ["revenue", "orders", "conversion"].includes(k.key));
  // 알림 배지는 주의가 필요한 등급(Critical·Warning)만 센다.
  const alerts = anomalies.filter((a) => a.severity !== "info");

  return (
    <div className="lg:hidden">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <MiraeWordmark height={40} />
          <h1 className="mt-2 text-[25px] font-bold leading-tight tracking-tight text-ink">
            오늘의 비즈니스 요약
          </h1>
          <p className="mt-1 text-[16px] text-ink-soft">{BRAND.user.display}</p>
          <LiveClock variant="stack" className="mt-2.5" />
        </div>
        <NotificationBell />
      </div>

      <div className="mb-4">
        <DateRangePicker dataset={dataset} />
      </div>

      {/* 핵심 KPI 3종 */}
      <div className="snap-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1" role="list" aria-label="핵심 지표">
        {topKpis.map((kpi, i) => {
          const up = kpi.changePct >= 0;
          const isPoint = kpi.key === "conversion";
          return (
            <div key={kpi.key} role="listitem" className="snap-item card animate-fade-up w-[46vw] max-w-[220px] shrink-0 p-4" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="text-[16.5px] font-medium text-ink-soft">{kpi.label}</p>
              <p className="mt-1 text-[24px] font-bold leading-tight tracking-tight text-ink">
                {formatValue(kpi.value, kpi.format)}
              </p>
              <p className={`mt-0.5 text-[16px] font-bold ${up ? "text-positive" : "text-negative"}`}>
                {up ? "▲" : "▼"} {Math.abs(kpi.changePct).toFixed(isPoint ? 2 : 1)}{isPoint ? "%p" : "%"}
              </p>
              <div className="mt-1.5">
                <Sparkline data={kpi.spark} color={up ? "#1478ff" : "#dd6350"} width={70} height={22} dots />
              </div>
            </div>
          );
        })}
      </div>

      {/* AI 핵심 인사이트 캐러셀 */}
      <div className="mt-4">
        <InsightCarousel insights={insights.slice(0, 4)} />
      </div>

      {/* 이상 징후 알림 */}
      <section className="mt-5">
        <SectionHeader
          title="이상 징후 알림"
          href="/anomalies"
          icon={<Bell className="h-6 w-6 text-warning" />}
          count={alerts.length}
        />
        <div className="card divide-y divide-line">
          {alerts.length === 0 ? (
            <p className="p-5 text-center text-[19px] text-ink-dim">
              이 기간에는 특이한 변화가 감지되지 않았습니다.
            </p>
          ) : (
            alerts.slice(0, 3).map((a) => {
              const Icon = a.severity === "critical" ? AlertOctagon : AlertTriangle;
              const tone = a.severity === "critical" ? "text-negative bg-negative-soft" : "text-warning bg-warning-soft";
              return (
                <Link key={a.id} href="/anomalies" className="flex gap-3 p-3.5 transition-colors active:bg-surface-soft">
                  <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[19px] font-semibold text-ink">{a.title}</span>
                      <span className="tabular shrink-0 text-[16px] text-ink-dim">{formatDateKR(a.date)}</span>
                    </span>
                    <span className="mt-0.5 block text-[17px] leading-relaxed text-ink-soft">{a.description}</span>
                  </span>
                </Link>
              );
            })
          )}
          <Link
            href="/notifications"
            className="flex items-center justify-center gap-1 py-3 text-[19px] font-semibold text-brand"
          >
            모든 알림 보기 <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* 예측 요약 */}
      <section className="mt-5">
        <SectionHeader title="예측 요약" href="/forecast" />
        <div className="snap-row -mx-4 flex gap-3 overflow-x-auto px-4 pb-1" role="list" aria-label="예측 요약">
          {forecasts.map((f, i) => (
            <div key={f.key} role="listitem" className="snap-item w-[62vw] max-w-[260px] shrink-0">
              <ForecastCard summary={f} delay={i * 60} compact />
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/reports"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-[21px] font-semibold text-white shadow-lg shadow-brand/25 transition-colors active:bg-brand-dark"
      >
        <Sparkles className="h-6 w-6" />
        AI 보고서 생성
      </Link>
    </div>
  );
}
