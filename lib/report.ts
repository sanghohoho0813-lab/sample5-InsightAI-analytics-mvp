import { applyFilters, computeKpis, filterDimensions, isComparable, resolveDates } from "./analytics-engine";
import { computeForecasts } from "./forecast-engine";
import { generateInsights, generateRecommendations } from "./insight-generator";
import { anomaliesFor, availableKpis, canSplit, insightContext } from "./dataset-meta";
import { formatChange, formatDateKR, formatKRW } from "./format";
import { Anomaly, DemoDataset, Filters, Insight, KpiResult, MetricKey, Recommendation, SavedReport } from "./types";

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

/** 비교 기준을 한 줄로 — "최근 30일 · 이전 30일과 비교" */
export function comparisonLabel(dataset: DemoDataset, filters: Filters): string {
  const { currentDates } = resolveDates(dataset.rows, filters);
  const n = currentDates.length;
  const head = filters.preset === "custom" ? `선택한 ${n}일` : `최근 ${n}일`;
  return isComparable(dataset.rows, filters) ? `${head} · 이전 ${n}일과 비교` : `${head} · 비교할 이전 기간 없음`;
}

export function reportSignature(dataset: DemoDataset, filters: Filters): string {
  const s = scopeOf(dataset, filters);
  return [dataset.id, s.start, s.end, s.channel, s.product].join("|");
}

export interface Why {
  title: string;
  description: string;
  drill?: { channel?: string; product?: string; metric?: MetricKey };
}

export interface Summary {
  comparable: boolean;
  revenue: KpiResult;
  headline: string;
  /** 왜 — 변화를 가장 많이 만든 채널(또는 상품) */
  why: Why | null;
  /** 지금 확인할 것 — 가장 심각한 이상치 */
  alert: Anomaly | null;
  /** 다음 행동 */
  next: Recommendation | null;
  kpis: KpiResult[];
  insights: Insight[];
  anomalies: Anomaly[];
  recommendations: Recommendation[];
}

/**
 * 기여도 분석 — 매출 증감분을 채널(채널을 골랐으면 상품)별로 나눠
 * 변화 방향과 같은 쪽으로 가장 크게 움직인 항목을 찾는다.
 */
function contributionDriver(dataset: DemoDataset, filters: Filters): Why | null {
  const dim: "channel" | "product" | null =
    filters.channel === "all" && canSplit(dataset, "channel")
      ? "channel"
      : filters.product === "all" && canSplit(dataset, "product")
        ? "product"
        : null;
  if (!dim) return null;
  const { current, previous } = applyFilters(dataset.rows, filters);
  const delta = new Map<string, number>();
  for (const r of current) delta.set(r[dim], (delta.get(r[dim]) ?? 0) + r.revenue);
  for (const r of previous) delta.set(r[dim], (delta.get(r[dim]) ?? 0) - r.revenue);
  const total = Array.from(delta.values()).reduce((a, b) => a + b, 0);
  const sign = total >= 0 ? 1 : -1;
  const [name, d] = Array.from(delta.entries()).sort((a, b) => b[1] * sign - a[1] * sign)[0] ?? [];
  if (name == null || d == null || d * sign <= 0) return null;
  const up = d >= 0;
  const share = total !== 0 ? (d / total) * 100 : 0;
  const unit = dim === "channel" ? "채널" : "상품";
  return {
    title: `${name} 매출 ${up ? "+" : "−"}${formatKRW(Math.abs(d))}`,
    description:
      share > 0 && share <= 100
        ? `전체 ${up ? "증가" : "감소"}분 ${formatKRW(Math.abs(total))} 중 ${share.toFixed(0)}%가 ${name}에서 나왔습니다.`
        : `${name}이(가) 크게 ${up ? "늘어 다른" : "줄어 다른"} ${unit}의 ${up ? "감소" : "증가"}를 ${up ? "메우고도 남았습니다" : "모두 상쇄했습니다"}.`,
    drill: dim === "channel" ? { channel: name, metric: "revenue" } : { product: name, metric: "revenue" },
  };
}

/** 대시보드·보고서 공통 요약: 답(무엇이 변했나) → 이유 → 다음 행동 */
export function summarize(dataset: DemoDataset, filters: Filters): Summary {
  const ctx = insightContext(dataset, filters);
  const kpis = availableKpis(computeKpis(dataset.rows, filters), dataset);
  const revenue = kpis.find((k) => k.key === "revenue") ?? kpis[0];
  const comparable = revenue.comparable;
  const { currentDates } = resolveDates(dataset.rows, filters);
  const insights = generateInsights(ctx);
  const anomalies = anomaliesFor(dataset, filters);
  const recommendations = generateRecommendations(ctx);
  const up = revenue.changePct >= 0;

  const headline = comparable
    ? `매출 ${formatKRW(revenue.value)}, 이전 ${currentDates.length}일보다 ${Math.abs(revenue.changePct).toFixed(1)}% ${up ? "늘었습니다" : "줄었습니다"}.`
    : `최근 ${currentDates.length}일 매출은 ${formatKRW(revenue.value)}입니다.`;

  let why: Why | null = comparable ? contributionDriver(dataset, filters) : null;
  if (!why && comparable) {
    const ins = insights.find((i) => (up ? i.impact === "positive" : i.impact === "negative")) ?? insights[0];
    if (ins) why = { title: ins.title, description: ins.description, drill: ins.drill };
  }
  if (!why && !comparable) {
    why = {
      title: "증감 비교 불가",
      description: "이전 같은 기간의 데이터가 없어 무엇이 변했는지는 계산하지 않았습니다. 기간을 줄이면 비교할 수 있습니다.",
    };
  }

  return {
    comparable,
    revenue,
    headline,
    why,
    alert: anomalies.find((a) => a.severity !== "info") ?? null,
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
    headline: `${s.headline} ${s.why && s.comparable ? s.why.description : ""}`.trim(),
    kpis: s.kpis.map(({ key, label, value, prevValue, changePct, format, comparable }) => ({
      key,
      label,
      value,
      prevValue,
      changePct,
      format,
      comparable,
    })),
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
    keyInsight: s.comparable ? (s.why?.title ?? `매출 ${formatChange(s.revenue.changePct)}`) : s.headline,
    revenueChangePct: s.comparable ? +s.revenue.changePct.toFixed(1) : undefined,
    alertCount: s.anomalies.filter((a) => a.severity !== "info").length,
  };
}
