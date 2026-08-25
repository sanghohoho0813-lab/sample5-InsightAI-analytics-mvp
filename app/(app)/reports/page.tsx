"use client";

import { useMemo, useState } from "react";
import { FileText, LoaderCircle, Printer, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { MiraeLockup } from "@/components/MiraeLogo";
import { channelShares, computeKpis, filterDimensions } from "@/lib/analytics-engine";
import { detectAnomalies } from "@/lib/anomaly-engine";
import { computeForecasts } from "@/lib/forecast-engine";
import { generateInsights, generateRecommendations } from "@/lib/insight-generator";
import { formatChange, formatKRW, formatValue } from "@/lib/format";

export default function ReportsPage() {
  const { dataset, filters, showToast } = useApp();
  const [phase, setPhase] = useState<"idle" | "generating" | "ready">("idle");

  const report = useMemo(() => {
    if (!dataset) return null;
    const ctx = { rows: dataset.rows, filters };
    const kpis = computeKpis(dataset.rows, filters);
    const revenue = kpis.find((k) => k.key === "revenue")!;
    const shares = channelShares(dataset.rows, filters);
    return {
      kpis,
      revenue,
      topChannel: shares[0],
      insights: generateInsights(ctx),
      anomalies: detectAnomalies(dataset.rows, filters).slice(0, 4),
      forecasts: computeForecasts(filterDimensions(dataset.rows, filters)),
      recommendations: generateRecommendations(ctx),
    };
  }, [dataset, filters]);

  if (!dataset || !report) {
    return (
      <>
        <PageHeader subtitle="AI 분석 내용을 한 번에 정리합니다" />
        <EmptyState />
      </>
    );
  }

  const generate = () => {
    setPhase("generating");
    setTimeout(() => {
      setPhase("ready");
      showToast("보고서가 생성되었습니다.", "success");
    }, 1600);
  };

  if (phase === "idle") {
    return (
      <>
        <PageHeader subtitle={`${dataset.name} · AI 분석 내용을 한 번에 정리합니다`} />
        <div className="card flex flex-col items-center px-6 py-16 text-center animate-fade-up">
          <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-soft">
            <FileText className="h-12 w-12 text-brand" />
          </span>
          <h2 className="mt-5 text-[27px] font-bold">AI 분석 보고서</h2>
          <p className="mt-1.5 max-w-md text-[19.5px] leading-relaxed text-ink-soft">
            Executive Summary, 핵심 KPI, 주요 변화, 이상징후, 예측, AI 제안까지
            최근 {filters.rangeDays}일 분석 내용을 하나의 보고서로 정리합니다.
          </p>
          <button
            onClick={generate}
            className="mt-6 flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-[21px] font-semibold text-white shadow-xl shadow-brand/30 transition-colors hover:bg-brand-dark"
          >
            <Sparkles className="h-6 w-6" />
            보고서 생성
          </button>
        </div>
      </>
    );
  }

  if (phase === "generating") {
    return (
      <>
        <PageHeader subtitle="보고서를 생성하고 있습니다" />
        <div className="card flex flex-col items-center px-6 py-16 text-center animate-fade-in">
          <LoaderCircle className="h-12 w-12 animate-spin text-brand" />
          <p className="mt-4 text-[21px] font-semibold">AI가 보고서를 작성하고 있습니다…</p>
          <p className="mt-1 text-[18px] text-ink-dim">핵심 변화와 제안을 정리하는 중입니다.</p>
        </div>
        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24 w-full" />
          ))}
        </div>
      </>
    );
  }

  const sectionTitle = "mb-3 flex items-center gap-2 text-[22.5px] font-bold";
  const num = (n: number) => (
    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-soft text-[17px] font-bold text-brand">{n}</span>
  );

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · 최근 ${filters.rangeDays}일`}
        actions={
          <button
            onClick={() => {
              showToast("인쇄 창에서 '대상 → PDF로 저장'을 선택하세요.", "info");
              setTimeout(() => window.print(), 300);
            }}
            className="no-print flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[18px] font-semibold text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Printer className="h-6 w-6" />
            PDF로 저장
          </button>
        }
      />

      <div className="space-y-4">
        <section className="card animate-fade-up flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
          <div>
            <MiraeLockup size="lg" />
            <p className="mt-2.5 text-[21px] font-bold text-ink">{BRAND.product} AI 분석 보고서</p>
            <p className="mt-1 text-[17px] text-ink-soft">
              {dataset.name} · 최근 {filters.rangeDays}일 · 작성 {BRAND.user.display}
            </p>
          </div>
          <span className="rounded-full bg-brand-soft px-3.5 py-1.5 text-[15px] font-semibold text-brand">
            {BRAND.company} 제작
          </span>
        </section>

        <section className="card animate-fade-up p-5 md:p-6">
          <h2 className={sectionTitle}>{num(1)} Executive Summary</h2>
          <p className="text-[20px] leading-relaxed text-ink-soft">
            최근 {filters.rangeDays}일 매출은 <b className="text-ink">{formatKRW(report.revenue.value)}</b>로 전 기간 대비{" "}
            <b className={report.revenue.changePct >= 0 ? "text-positive" : "text-negative"}>
              {formatChange(report.revenue.changePct)}
            </b>{" "}
            변화했습니다. 매출 비중이 가장 큰 채널은{" "}
            <b className="text-ink">{report.topChannel?.channel}</b>({report.topChannel?.share.toFixed(1)}%)이며,{" "}
            {report.anomalies.length > 0
              ? `${report.anomalies.length}건의 이상징후가 감지되어 확인이 필요합니다.`
              : "이 기간에는 특이한 이상징후가 감지되지 않았습니다."}{" "}
            다음 7일 매출은 {formatKRW(report.forecasts[0].next7Total)} 수준으로 예상됩니다.
          </p>
        </section>

        <section className="card animate-fade-up p-5 md:p-6" style={{ animationDelay: "60ms" }}>
          <h2 className={sectionTitle}>{num(2)} 핵심 KPI</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[19px]">
              <thead>
                <tr className="border-b border-line text-left text-[17px] uppercase tracking-wide text-ink-dim">
                  <th className="px-3 py-2 font-medium">지표</th>
                  <th className="px-3 py-2 text-right font-medium">현재</th>
                  <th className="px-3 py-2 text-right font-medium">전 기간</th>
                  <th className="px-3 py-2 text-right font-medium">변화</th>
                </tr>
              </thead>
              <tbody>
                {report.kpis.map((k) => (
                  <tr key={k.key} className="border-b border-line/60 last:border-0">
                    <td className="px-3 py-2.5 font-medium">{k.label}</td>
                    <td className="tabular px-3 py-2.5 text-right font-semibold">{formatValue(k.value, k.format)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ink-soft">{formatValue(k.prevValue, k.format)}</td>
                    <td className={`tabular px-3 py-2.5 text-right font-semibold ${k.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                      {formatChange(k.changePct)}{k.key === "conversion" ? "p" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card animate-fade-up p-5 md:p-6" style={{ animationDelay: "120ms" }}>
          <h2 className={sectionTitle}>{num(3)} 주요 변화</h2>
          <ul className="space-y-2.5">
            {report.insights.map((ins) => (
              <li key={ins.id} className="rounded-xl border border-line bg-surface-soft p-3.5">
                <p className="text-[16.5px] font-semibold uppercase tracking-wide text-brand">{ins.category}</p>
                <p className="mt-0.5 text-[19.5px] font-semibold">{ins.title}</p>
                <p className="mt-0.5 text-[19px] leading-relaxed text-ink-soft">{ins.description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="card animate-fade-up p-5 md:p-6" style={{ animationDelay: "180ms" }}>
          <h2 className={sectionTitle}>{num(4)} 이상징후</h2>
          {report.anomalies.length === 0 ? (
            <p className="text-[19px] text-ink-dim">이 기간에는 이상징후가 감지되지 않았습니다.</p>
          ) : (
            <ul className="space-y-2">
              {report.anomalies.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-[19px]">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      a.severity === "critical" ? "bg-negative" : a.severity === "warning" ? "bg-warning" : "bg-brand"
                    }`}
                  />
                  <span className="text-ink-soft"><b className="text-ink">{a.title}</b> — {a.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card animate-fade-up p-5 md:p-6" style={{ animationDelay: "240ms" }}>
          <h2 className={sectionTitle}>{num(5)} 예측</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {report.forecasts.map((f) => (
              <div key={f.key} className="rounded-xl border border-line bg-surface-soft p-3.5">
                <p className="text-[17px] text-ink-dim">{f.label} · 다음 7일</p>
                <p className="mt-1 text-[25.5px] font-bold">
                  {f.format === "currency" ? formatKRW(f.next7Total) : f.next7Total.toLocaleString("ko-KR")}
                </p>
                <p className={`mt-0.5 text-[18px] font-semibold ${f.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatChange(f.changePct)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="card animate-fade-up p-5 md:p-6" style={{ animationDelay: "300ms" }}>
          <h2 className={sectionTitle}>{num(6)} AI Recommendation</h2>
          <ul className="space-y-2.5">
            {report.recommendations.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-surface-soft p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[19.5px] font-semibold">{r.title}</p>
                  <span className="shrink-0 text-[18px] font-bold text-positive">{r.expectedEffect}</span>
                </div>
                <p className="mt-0.5 text-[19px] leading-relaxed text-ink-soft">{r.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
