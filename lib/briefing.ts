import { applyFilters, computeKpis, isComparable, resolveDates } from "./analytics-engine";
import {
  contributions,
  decompose,
  dominantFactor,
  driverDim,
  factorLine,
  halfTrend,
  productMomentum,
  signed,
  signedKRW,
  sumRows,
} from "./drivers";
import { anomaliesFor, availableKpis, canSplit, insightContext } from "./dataset-meta";
import { urgency } from "./anomaly-engine";
import { formatKRW, josa } from "./format";
import { FACTOR_METRIC, factorPhrase, generateInsights, generateRecommendations, segmentFactors } from "./insight-generator";
import { investigate } from "./investigate";
import { ActionLink, Anomaly, DemoDataset, Filters, Insight, KpiResult, Recommendation } from "./types";

/**
 * 경영 브리핑 — 대시보드 맨 위와 보고서 요약이 같은 계산을 쓴다.
 * "이번 기간에 무슨 일이 있었나 → 가장 큰 변화 → 가장 가능성 높은 원인 → 지금 확인할 위험 → 다음 행동"
 */

export interface BriefPoint {
  title: string;
  body: string;
  /** 결론을 확인할 수 있는 계산값 */
  evidence?: string[];
  /** 계산 방식·추정 여부 */
  basis?: string;
  tone: "positive" | "negative" | "neutral";
  link?: ActionLink & { label: string };
}

export interface Briefing {
  comparable: boolean;
  /** "최근 30일" */
  span: string;
  headline: string;
  revenue: KpiResult;
  /** 이전 기간 대비 매출 증감액(비교 불가면 null) */
  revenueDelta: number | null;
  change: BriefPoint | null;
  cause: BriefPoint | null;
  /** 원인을 계산하지 못했을 때 그 이유 */
  causeHint: string;
  risk: BriefPoint | null;
  /** 위험으로 고르지 않은 나머지 확인 항목 수 */
  otherRisks: number;
  actions: Recommendation[];
  kpis: KpiResult[];
  insights: Insight[];
  anomalies: Anomaly[];
  recommendations: Recommendation[];
}

const unitOf = (dim: "channel" | "product") => (dim === "channel" ? "채널" : "상품");

export function summarize(dataset: DemoDataset, filters: Filters): Briefing {
  const ctx = insightContext(dataset, filters);
  const { rows, derived } = ctx;
  const kpis = availableKpis(computeKpis(rows, filters), dataset);
  const revenue = kpis.find((k) => k.key === "revenue") ?? kpis[0];
  const comparable = isComparable(rows, filters);
  const { currentDates } = resolveDates(rows, filters);
  const n = currentDates.length;
  const span = filters.preset === "custom" ? `선택한 ${n}일` : `최근 ${n}일`;
  const insights = generateInsights(ctx);
  const anomalies = anomaliesFor(dataset, filters);
  const recommendations = generateRecommendations(ctx, anomalies);
  const { current, previous } = applyFilters(rows, filters);
  const total = { cur: sumRows(current), prev: sumRows(previous) };
  const revenueDelta = comparable ? total.cur.revenue - total.prev.revenue : null;
  const pct = revenue.changePct;
  const dim = driverDim(filters, (d) => canSplit(dataset, d));

  // 0) 한 문장 — 이번 기간에 무슨 일이 있었나
  const headline = !comparable
    ? `${span} 매출은 ${formatKRW(revenue.value)}입니다.`
    : Math.abs(pct) < 1
      ? `매출이 이전 ${n}일과 비슷합니다(${signed(pct, 1)}).`
      : `매출이 이전 ${n}일보다 ${Math.abs(pct).toFixed(1)}% ${pct > 0 ? "늘었습니다" : "줄었습니다"}.`;

  // 1) 가장 큰 변화 — 증감분을 가장 많이 만든 채널(채널을 골랐으면 상품)
  let change: BriefPoint | null = null;
  let segment: { channel?: string; product?: string; name: string } | null = null;
  if (comparable && dim) {
    const c = contributions(rows, filters, dim);
    const top = c.items[0];
    const up = c.delta >= 0;
    const evidence = c.items.slice(0, 4).map((i) => `${i.name} ${signedKRW(i.delta)} (${signed(i.pct)})`);
    if (Math.abs(pct) < 2) {
      const gain = [...c.items].sort((a, b) => b.delta - a.delta)[0];
      const loss = [...c.items].sort((a, b) => a.delta - b.delta)[0];
      if (gain && loss && gain.delta > 0 && loss.delta < 0) {
        segment = dim === "channel" ? { channel: loss.name, name: loss.name } : { product: loss.name, name: loss.name };
        change = {
          title: `${gain.name} ${signedKRW(gain.delta)} · ${loss.name} ${signedKRW(loss.delta)}`,
          body: `전체 매출은 비슷하지만 ${unitOf(dim)}별로는 엇갈렸습니다.`,
          evidence,
          basis: "이전 같은 기간과 실제 매출 차이",
          tone: "neutral",
          link: { kind: "segment", ...(dim === "channel" ? { channel: loss.name } : { product: loss.name }), metric: "revenue", label: `${loss.name}만 보기` },
        };
      }
    } else if (top && top.share > 0) {
      segment = dim === "channel" ? { channel: top.name, name: top.name } : { product: top.name, name: top.name };
      const share = Math.round(top.share);
      change = {
        title: `${top.name} 매출 ${signedKRW(top.delta)}`,
        body:
          share <= 100
            ? `전체 ${up ? "증가" : "감소"}분 ${formatKRW(Math.abs(c.delta))} 중 ${share}%가 ${top.name}에서 나왔습니다.`
            : `${top.name} 하나가 다른 ${unitOf(dim)}의 ${up ? "감소를 메우고도 남았습니다" : "증가를 모두 상쇄했습니다"}.`,
        evidence,
        basis: "이전 같은 기간과 실제 매출 차이",
        tone: up ? "positive" : "negative",
        link: { kind: "segment", ...(dim === "channel" ? { channel: top.name } : { product: top.name }), metric: "revenue", label: `${top.name}만 보기` },
      };
    }
  } else if (comparable && revenueDelta != null) {
    change = {
      title: `매출 ${signedKRW(revenueDelta)}`,
      body: `하루 평균 ${formatKRW(total.prev.revenue / n)}에서 ${josa(formatKRW(total.cur.revenue / n), "으로")} ${revenueDelta >= 0 ? "늘었습니다" : "줄었습니다"}.`,
      basis: "이전 같은 기간과 실제 매출 차이",
      tone: revenueDelta >= 0 ? "positive" : "negative",
    };
  } else if (!comparable) {
    const h = halfTrend(rows, filters);
    if (h) {
      change = {
        title: `기간 후반 매출 ${signed(h.pct)}`,
        body: `앞 ${h.days}일 ${formatKRW(h.first)} → 뒤 ${h.days}일 ${formatKRW(h.second)}. 이전 같은 기간 데이터가 없어 기간 안에서 비교했습니다.`,
        basis: "선택 기간을 반으로 나눠 비교",
        tone: Math.abs(h.pct) < 3 ? "neutral" : h.pct > 0 ? "positive" : "negative",
      };
    }
  }

  // 2) 가장 가능성 높은 원인 — 그 변화를 방문자·전환율·객단가로 나눠 가장 큰 요인
  let cause: BriefPoint | null = null;
  let causeHint = "";
  if (comparable) {
    const factors = segment ? segmentFactors(ctx, segment) : decompose(total.cur, total.prev, derived);
    const dom = dominantFactor(factors);
    const who = segment?.name ?? "전체";
    if (factors && dom) {
      const evidence = factors.map((f) => `${f.label} ${f.text} (${signed(f.pct)})`);
      // 채널 안에서 한 상품에 몰렸는지도 근거로 덧붙인다.
      if (segment?.channel && canSplit(dataset, "product") && filters.product === "all") {
        const inner = contributions(rows, { ...filters, channel: segment.channel }, "product").items[0];
        if (inner && inner.share >= 50 && inner.share <= 100)
          evidence.push(`${segment.channel} 변화분 중 '${inner.name}' ${Math.round(inner.share)}%`);
      }
      // 두 번째 요인의 몫이 첫 번째와 비슷하면(75% 이상) 둘을 함께 원인으로 말한다.
      const ranked = [...factors].sort((x, y) => y.share - x.share);
      const second = ranked[1] && ranked[1].share >= dom.share * 0.75 ? ranked[1] : null;
      const shares = (second ? [dom, second] : [dom]).map((f) => `${f.label} ${Math.min(100, Math.round(f.share))}%`).join(", ");
      cause = {
        title: `${who === "전체" ? "" : `${who} `}${factorPhrase(dom)}${second ? `·${factorPhrase(second)}` : ""}`,
        body: `${factorLine(factors)}. ${who === "전체" ? "" : `${who} `}매출 변화 중 ${shares}가량을 설명합니다.`,
        evidence,
        basis: `${factors[0].key === "visitors" ? "매출 = 방문자 × 전환율 × 객단가" : "매출 = 주문 수 × 객단가"}로 나눈 계산 · 원인은 추정`,
        // 개선·증가 쪽 요인이면 긍정, 하락 쪽이면 부정
        tone: dom.pct >= 0 ? "positive" : "negative",
        link: {
          kind: "segment",
          channel: segment?.channel,
          product: segment?.product,
          metric: FACTOR_METRIC[dom.key],
          label: `${dom.label} 추이 보기`,
        },
      };
    } else if (derived?.includes("orders")) {
      causeHint = "주문 수 컬럼이 없어 매출 변화를 방문자·전환율·객단가로 나눌 수 없습니다.";
    } else {
      causeHint = "매출 변화가 1% 미만이라 요인을 나누지 않았습니다.";
    }
  } else {
    const rising = productMomentum(rows, filters, derived).find((m) => m.pct >= 15);
    if (rising) {
      cause = {
        title: `'${rising.product}' 판매 가속`,
        body: `최근 7일 판매가 그 전 3주의 주간 수준보다 ${rising.pct.toFixed(0)}% 많습니다.`,
        basis: "최근 7일 vs 그 전 3주(주 단위 중앙값)",
        tone: "positive",
        link: { kind: "segment", product: rising.product, metric: "revenue", label: `${rising.product}만 보기` },
      };
    } else causeHint = "이전 같은 기간 데이터가 없어 무엇 때문에 변했는지는 계산하지 않았습니다. 기간을 줄이면 비교할 수 있습니다.";
  }
  // 3) 지금 확인할 위험 — 이어지는 이상치 > 역행하는 채널 > 광고 효율 > 최근 큰 이상치 > 상품 둔화
  const end = currentDates[n - 1] ?? "";
  const candidates: { score: number; point: () => BriefPoint }[] = [];
  for (const a of anomalies.filter((x) => x.direction === "down" && x.severity !== "info")) {
    candidates.push({
      score: urgency(a, end),
      point: () => {
        const inv = investigate(dataset, a, filters);
        return {
          title: a.title,
          body: inv ? inv.timeline.text : a.description,
          evidence: inv ? [inv.what, inv.diagnosis.cause] : [a.description],
          basis: "평소 수준(직전 7일·같은 요일) 대비 · 원인 유형은 추정",
          tone: "negative",
          link: { kind: "anomaly", id: a.id, label: "이 변화 조사하기" },
        };
      },
    });
  }
  const fromInsight = (id: string, score: number) => {
    const ins = insights.find((i) => i.id === id && i.impact === "negative");
    if (!ins) return;
    candidates.push({
      score,
      point: () => ({
        title: ins.title,
        body: ins.description,
        evidence: ins.evidence,
        basis: ins.basis,
        tone: "negative",
        link: ins.drill ? { kind: "segment", ...ins.drill, label: `${ins.drill.channel ?? ins.drill.product ?? "관련 데이터"} 자세히 보기` } : undefined,
      }),
    });
  };
  fromInsight("counter-trend", 80);
  fromInsight("ad-weak", 70);
  fromInsight("product-falling", 45);
  candidates.sort((a, b) => b.score - a.score);
  const risk = candidates[0]?.point() ?? null;

  return {
    comparable,
    span,
    headline,
    revenue,
    revenueDelta,
    change,
    cause,
    causeHint,
    risk,
    otherRisks: Math.max(0, candidates.length - 1),
    actions: recommendations.slice(0, 3),
    kpis,
    insights,
    anomalies,
    recommendations,
  };
}
