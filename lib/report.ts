import { isComparable, resolveDates, uniqueDates } from "./analytics-engine";
import { BriefPoint, summarize } from "./briefing";
import { forecastsFor } from "./dataset-meta";
import { formatDateKR } from "./format";
import { BriefSnapshot, DemoDataset, DerivedField, Filters, SavedReport } from "./types";

export { summarize };

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

const FIELD_LABEL: Partial<Record<DerivedField, string>> = {
  orders: "주문 수",
  visitors: "방문자",
  customers: "고객 수",
  returningCustomers: "재구매 고객",
  adSpend: "광고비",
  channel: "채널",
  product: "상품",
};

const snap = (p: BriefPoint | null): BriefSnapshot | undefined =>
  p ? { title: p.title, body: p.body, evidence: p.evidence, basis: p.basis, tone: p.tone } : undefined;

/** 저장 시점의 분석 결론을 보고서(업무 기록)로 만든다. */
export function buildReport(dataset: DemoDataset, filters: Filters, title?: string): SavedReport {
  const s = summarize(dataset, filters);
  const scope = scopeOf(dataset, filters);
  const forecasts = forecastsFor(dataset, filters);
  const createdAt = new Date().toISOString();
  const dates = uniqueDates(dataset.rows);
  const defaultTitle = `${dataset.name} · ${formatDateKR(scope.start).slice(5)} ~ ${formatDateKR(scope.end).slice(5)} 보고서`;
  return {
    id: `rp-${Date.now().toString(36)}`,
    title: title?.trim() || defaultTitle,
    createdAt,
    datasetId: dataset.id,
    datasetName: dataset.name,
    signature: reportSignature(dataset, filters),
    scope,
    comparison: comparisonLabel(dataset, filters),
    headline: s.headline,
    brief: { change: snap(s.change), cause: snap(s.cause), risk: snap(s.risk) },
    data: {
      source: dataset.id.startsWith("demo-") ? "demo" : "upload",
      rows: dataset.rows.length,
      days: dates.length,
      lastDate: dates[dates.length - 1] ?? "",
      estimated: (dataset.derived ?? []).map((f) => FIELD_LABEL[f]).filter((x): x is string => !!x),
    },
    kpis: s.kpis.map(({ key, label, value, prevValue, changePct, format, comparable }) => ({
      key,
      label,
      value,
      prevValue,
      changePct,
      format,
      comparable,
    })),
    findings: s.insights.map(({ title, description, impact, evidence, basis }) => ({ title, description, impact, evidence, basis })),
    anomalies: s.anomalies
      .filter((a) => a.severity !== "info")
      .slice(0, 5)
      .map(({ title, description, severity, date, days, ongoing }) => ({ title, description, severity, date, days, ongoing })),
    forecasts: forecasts.map(({ label, next7Total, changePct, format }) => ({ label, next7Total, changePct, format })),
    recommendations: s.recommendations.map(({ title, description, evidence, priority }) => ({
      title,
      description,
      evidence,
      priority,
    })),
  };
}

/** 분석 히스토리에 남길 핵심 한 줄 */
export function keyFinding(dataset: DemoDataset, filters: Filters) {
  const s = summarize(dataset, filters);
  return {
    keyInsight: s.comparable && s.change ? `${s.change.title} · ${s.headline}` : s.headline,
    revenueChangePct: s.comparable ? +s.revenue.changePct.toFixed(1) : undefined,
    alertCount: s.anomalies.filter((a) => a.severity !== "info").length,
  };
}
