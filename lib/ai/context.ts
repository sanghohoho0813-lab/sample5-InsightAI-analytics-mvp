import { channelShares, computeKpis, exploreSeries, filterDimensions, isComparable, resolveDates } from "../analytics-engine";
import { computeForecasts } from "../forecast-engine";
import { anomaliesFor, availableKpis, canSplit } from "../dataset-meta";
import { formatKRW, formatValue } from "../format";
import { summarize } from "../briefing";
import { DemoDataset, Filters } from "../types";
import { AiContext } from "./contract";

const FIELD_NAMES: Record<string, string> = {
  orders: "주문 수",
  visitors: "방문자·전환율",
  customers: "고객 수",
  returningCustomers: "재구매 고객",
  adSpend: "광고비·ROAS",
};

const pct = (n: number, digits = 1) => `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;

/** 대시보드 브리핑과 인사이트 제목 — 모델이 화면의 결론과 다른 말을 하지 않게 함께 보낸다. */
function briefingLines(ds: DemoDataset, filters: Filters): string[] {
  const b = summarize(ds, filters);
  const lines = [b.headline];
  if (b.change) lines.push(`가장 큰 변화: ${b.change.title} — ${b.change.body}`);
  if (b.cause) lines.push(`가능성 높은 원인(추정): ${b.cause.title} — ${b.cause.body}`);
  if (b.risk) lines.push(`확인할 위험: ${b.risk.title} — ${b.risk.body}`);
  for (const i of b.insights.slice(0, 5)) lines.push(`발견: ${i.title}`);
  for (const r of b.actions) lines.push(`권장 행동: ${r.title}`);
  return lines;
}

/**
 * LLM에 넘길 데이터 요약. 규칙 기반 엔진과 같은 계산 결과를 쓰므로
 * LLM 답변과 화면의 숫자가 서로 어긋나지 않는다. (원본 행은 보내지 않는다)
 */
export function buildAiContext(ds: DemoDataset, filters: Filters): AiContext {
  const { currentDates } = resolveDates(ds.rows, filters);
  const comparable = isComparable(ds.rows, filters);
  const kpis = availableKpis(computeKpis(ds.rows, filters), ds);
  const shares = canSplit(ds, "channel") ? channelShares(ds.rows, filters) : [];
  const products = canSplit(ds, "product") ? exploreSeries(ds.rows, filters, "revenue", "product") : [];
  const productTotal = products.reduce((a, p) => a + p.value, 0) || 1;
  const forecast = computeForecasts(filterDimensions(ds.rows, filters))[0];

  return {
    dataset: ds.name,
    period: { start: currentDates[0] ?? "", end: currentDates[currentDates.length - 1] ?? "", days: currentDates.length, comparable },
    kpis: kpis.map((k) => ({
      label: k.label,
      value: formatValue(k.value, k.format),
      change: !comparable ? null : k.key === "conversion" ? `${pct(k.changePct, 2)}p` : pct(k.changePct),
    })),
    channels: shares.slice(0, 8).map((s) => ({
      name: s.channel,
      revenue: formatKRW(s.revenue),
      share: `${s.share.toFixed(1)}%`,
      change: comparable ? `${s.changePct >= 0 ? "+" : ""}${s.changePct.toFixed(1)}%p` : null,
    })),
    products: products.slice(0, 8).map((p) => ({
      name: p.name,
      revenue: formatKRW(p.value),
      share: `${((p.value / productTotal) * 100).toFixed(1)}%`,
    })),
    anomalies: anomaliesFor(ds, filters)
      .slice(0, 6)
      .map((a) => ({ date: a.date, title: a.title, detail: a.description })),
    forecast: forecast ? { next7Revenue: formatKRW(forecast.next7Total), changeVsLast7: pct(forecast.changePct) } : null,
    findings: briefingLines(ds, filters),
    unavailable: (ds.derived ?? []).map((f) => FIELD_NAMES[f]).filter(Boolean),
  };
}
