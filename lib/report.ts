import { computeKpis, filterDimensions, resolveDates } from "./analytics-engine";
import { detectAnomalies } from "./anomaly-engine";
import { computeForecasts } from "./forecast-engine";
import { generateInsights, generateRecommendations } from "./insight-generator";
import { formatChange, formatDateKR, formatKRW } from "./format";
import { Anomaly, DemoDataset, Filters, Insight, KpiResult, Recommendation, SavedReport } from "./types";

/** 분석 범위를 사람이 읽을 수 있게 — "9월 1일 ~ 9월 30일 · 전체 채널" */
export function scopeOf(dataset: DemoDataset, filters: Filters) {
  const { currentDates } = resolveDates(dataset.rows, filters);
  return {
    start: currentDates[0] ?? "",
    end: currentDates[currentDates.length - 1] ?? "",
    days: currentDates.length,
    channel: filters.channel,
    product: filters.product,
  };
}

export function scopeLabel(scope: SavedReport["scope"]): string {
  const parts = [`${formatDateKR(scope.start)} ~ ${formatDateKR(scope.end)}`];
  parts.push(scope.channel === "all" ? "전체 채널" : scope.channel);
  if (scope.product !== "all") parts.push(scope.product);
  return parts.join(" · ");
}

export function reportSignature(dataset: DemoDataset, filters: Filters): string {
  const s = scopeOf(dataset, filters);
  return [dataset.id, s.start, s.end, s.channel, s.product].join("|");
}

export interface Summary {
  revenue: KpiResult;
  headline: string;
  /** 왜 — 가장 큰 변화 요인 */
  why: Insight | null;
  /** 지금 확인할 것 — 가장 심각한 이상치 */
  alert: Anomaly | null;
  /** 다음 행동 */
  next: Recommendation | null;
  kpis: KpiResult[];
  insights: Insight[];
  anomalies: Anomaly[];
  recommendations: Recommendation[];
}

/** 대시보드·보고서 공통 요약: 답(무엇이 변했나) → 이유 → 다음 행동 */
export function summarize(dataset: DemoDataset, filters: Filters): Summary {
  const ctx = { rows: dataset.rows, filters };
  const kpis = computeKpis(dataset.rows, filters);
  const revenue = kpis.find((k) => k.key === "revenue") ?? kpis[0];
  const insights = generateInsights(ctx);
  const anomalies = detectAnomalies(dataset.rows, filters);
  const recommendations = generateRecommendations(ctx);
  const up = revenue.changePct >= 0;
  const headline = `매출 ${formatKRW(revenue.value)}, 이전 같은 기간보다 ${Math.abs(revenue.changePct).toFixed(1)}% ${up ? "늘었습니다" : "줄었습니다"}.`;
  // 매출이 줄었으면 부정적 요인을, 늘었으면 긍정적 요인을 먼저 설명한다.
  const why =
    insights.find((i) => (up ? i.impact === "positive" : i.impact === "negative")) ?? insights[0] ?? null;
  const alert = anomalies.find((a) => a.severity !== "info") ?? null;
  return {
    revenue,
    headline,
    why,
    alert,
    next: recommendations[0] ?? null,
    kpis,
    insights,
    anomalies,
    recommendations,
  };
}

/** 저장 시점의 분석 결과를 보고서 스냅샷으로 만든다. */
export function buildReport(dataset: DemoDataset, filters: Filters, title?: string): SavedReport {
  const s = summarize(dataset, filters);
  const scope = scopeOf(dataset, filters);
  const forecasts = computeForecasts(filterDimensions(dataset.rows, filters));
  const createdAt = new Date().toISOString();
  const defaultTitle = `${dataset.name} · ${formatDateKR(scope.start).slice(5)} ~ ${formatDateKR(scope.end).slice(5)} 보고서`;
  return {
    id: `rp-${Date.now().toString(36)}`,
    title: title?.trim() || defaultTitle,
    createdAt,
    datasetId: dataset.id,
    datasetName: dataset.name,
    signature: reportSignature(dataset, filters),
    scope,
    headline: `${s.headline} ${s.why ? s.why.description : ""}`.trim(),
    kpis: s.kpis.map(({ key, label, value, prevValue, changePct, format }) => ({ key, label, value, prevValue, changePct, format })),
    findings: s.insights.map(({ title, description, impact }) => ({ title, description, impact })),
    anomalies: s.anomalies
      .filter((a) => a.severity !== "info")
      .slice(0, 5)
      .map(({ title, description, severity, date }) => ({ title, description, severity, date })),
    forecasts: forecasts.map(({ label, next7Total, changePct, format }) => ({ label, next7Total, changePct, format })),
    recommendations: s.recommendations.map(({ title, description, expectedEffect, priority }) => ({
      title,
      description,
      expectedEffect,
      priority,
    })),
  };
}

/** 분석 히스토리에 남길 핵심 한 줄 */
export function keyFinding(dataset: DemoDataset, filters: Filters) {
  const s = summarize(dataset, filters);
  return {
    keyInsight: s.why?.title ?? `매출 ${formatChange(s.revenue.changePct)}`,
    revenueChangePct: +s.revenue.changePct.toFixed(1),
    alertCount: s.anomalies.filter((a) => a.severity !== "info").length,
  };
}
