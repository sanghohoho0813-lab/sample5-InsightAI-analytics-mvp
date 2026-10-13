import { applyFilters, isComparable, resolveDates } from "./analytics-engine";
import {
  adEfficiency,
  Contribution,
  contributions,
  decompose,
  dominantFactor,
  driverDim,
  FactorChange,
  factorLine,
  halfTrend,
  Momentum,
  productMomentum,
  signed,
  signedKRW,
  sumRows,
  weakAdSpend,
} from "./drivers";
import { formatKRW, formatMonthDay, formatNumber, josa } from "./format";
import { urgency } from "./anomaly-engine";
import { diagnose } from "./investigate";
import { Anomaly, DataRow, DerivedField, DrillTarget, Filters, Insight, MetricKey, Recommendation } from "./types";

export interface Context {
  rows: DataRow[];
  filters: Filters;
  /** 업로드 파일에서 추정으로 채운 필드 — 이 값에 기대는 인사이트는 만들지 않는다 */
  derived?: DerivedField[];
}

const BASIS = {
  compare: "이전 같은 기간과 실제 매출 차이",
  factor: "매출 = 방문자 × 전환율 × 객단가로 나눠 계산",
  factorOrders: "매출 = 주문 수 × 객단가로 나눠 계산",
  momentum: "최근 7일 vs 그 전 3주(주 단위 중앙값)",
  ad: "이전 같은 기간과 실제 광고비·주문 수 비교",
  half: "선택 기간을 반으로 나눠 비교",
};

/** 요인이 움직인 방향을 사람 말로 — "전환율 개선", "방문자 감소" */
export function factorPhrase(f: FactorChange): string {
  const up = f.pct >= 0;
  switch (f.key) {
    case "visitors":
      return up ? "방문자 증가" : "방문자 감소";
    case "conversion":
      return up ? "전환율 개선" : "전환율 하락";
    case "aov":
      return up ? "객단가 상승" : "객단가 하락";
    default:
      return up ? "주문 증가" : "주문 감소";
  }
}

export const FACTOR_METRIC: Record<FactorChange["key"], MetricKey> = {
  visitors: "revenue",
  conversion: "conversion",
  aov: "aov",
  orders: "orders",
};

function unitText(m: Momentum, v: number) {
  return m.unit === "orders" ? `${formatNumber(v)}건` : formatKRW(v);
}

/** 채널·상품 하나의 매출 변화를 요인으로 나눈다 */
export function segmentFactors(ctx: Context, target: DrillTarget): FactorChange[] | null {
  const { rows, filters, derived = [] } = ctx;
  const f = { ...filters, channel: target.channel ?? filters.channel, product: target.product ?? filters.product };
  const { current, previous } = applyFilters(rows, f);
  return decompose(sumRows(current), sumRows(previous), derived);
}

const splittable = (rows: DataRow[], dim: "channel" | "product") => new Set(rows.map((r) => r[dim])).size > 1;
const dimTarget = (dim: "channel" | "product", name: string): DrillTarget =>
  dim === "channel" ? { channel: name, metric: "revenue" } : { product: name, metric: "revenue" };

/**
 * 계산된 값만으로 인사이트를 만든다. 모든 인사이트는
 * 결론(제목) → 수치(설명) → 확인할 수 있는 근거(evidence) → 계산 방식(basis)을 갖는다.
 */
export function generateInsights(ctx: Context): Insight[] {
  const { rows, filters, derived = [] } = ctx;
  const insights: Insight[] = [];
  const comparable = isComparable(rows, filters);
  const { current, previous, currentDates } = applyFilters(rows, filters);
  const n = currentDates.length;
  const dim = driverDim(filters, (d) => splittable(rows, d));
  const total = { cur: sumRows(current), prev: sumRows(previous) };
  const totalPct = total.prev.revenue > 0 ? ((total.cur.revenue - total.prev.revenue) / total.prev.revenue) * 100 : 0;

  // 1) 기여도 — 증감분을 가장 많이 만든 채널(채널을 골랐으면 상품)
  if (comparable && dim) {
    const c = contributions(rows, filters, dim);
    const unit = dim === "channel" ? "채널" : "상품";
    const evidence = c.items.slice(0, 4).map((i) => `${i.name} ${formatKRW(i.prev)} → ${formatKRW(i.cur)} (${signed(i.pct)})`);
    const top = c.items[0];
    if (Math.abs(totalPct) < 2) {
      // 전체는 비슷한데 안에서 엇갈린 경우
      const gain = [...c.items].sort((a, b) => b.delta - a.delta)[0];
      const loss = [...c.items].sort((a, b) => a.delta - b.delta)[0];
      if (gain && loss && gain.delta > 0 && loss.delta < 0) {
        insights.push({
          id: "driver",
          category: `${unit}별 기여`,
          title: `전체 매출은 비슷하지만 ${unit}별로 엇갈렸습니다`,
          description: `${josa(gain.name, "은")} ${formatKRW(gain.delta)} 늘고 ${josa(loss.name, "은")} ${formatKRW(Math.abs(loss.delta))} 줄어, 전체 변화는 ${signed(totalPct, 1)}에 그쳤습니다.`,
          evidence,
          basis: BASIS.compare,
          impact: "neutral",
          drill: dimTarget(dim, loss.name),
        });
      }
    } else if (top && top.share > 0) {
      const up = c.delta > 0;
      const share = Math.round(top.share);
      insights.push({
        id: "driver",
        category: `${unit}별 기여`,
        title:
          share > 100
            ? `${top.name} 하나가 전체 ${up ? "증가분" : "감소분"}보다 크게 움직였습니다`
            : up
              ? `매출 증가분의 ${share}%는 ${top.name}에서 나왔습니다`
              : `${top.name} 감소가 전체 하락의 ${share}%를 설명합니다`,
        description:
          share > 100
            ? `${top.name} 매출이 ${signedKRW(top.delta)} 움직여, 다른 ${unit}의 반대 움직임(${signedKRW(top.delta - c.delta)})을 ${up ? "메우고도 남았습니다" : "모두 상쇄했습니다"}.`
            : `${top.name} 매출이 ${formatKRW(top.prev)}에서 ${josa(formatKRW(top.cur), "으로")} ${signedKRW(top.delta)}(${signed(top.pct)}) ${top.delta >= 0 ? "늘었습니다" : "줄었습니다"}. 전체 ${up ? "증가분" : "감소분"}은 ${formatKRW(Math.abs(c.delta))}입니다.`,
        evidence,
        basis: BASIS.compare,
        impact: up ? "positive" : "negative",
        drill: dimTarget(dim, top.name),
      });
    }

    // 2) 역행 — 전체와 반대로 움직인 채널·상품(전체 매출의 5% 이상인 것만)
    const opposite = c.items
      .filter((i) => i.prev >= c.prev * 0.05 && Math.abs(i.pct) >= 5 && Math.sign(i.delta) !== Math.sign(c.delta))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    if (opposite && Math.abs(totalPct) >= 2) {
      const factors = segmentFactors(ctx, dim === "channel" ? { channel: opposite.name } : { product: opposite.name });
      const dom = dominantFactor(factors);
      const down = opposite.delta < 0;
      insights.push({
        id: "counter-trend",
        category: down ? "위험 신호" : "버팀목",
        title: `전체는 ${down ? "늘었지만" : "줄었지만"} ${opposite.name} 매출은 ${Math.abs(opposite.pct).toFixed(0)}% ${down ? "줄었습니다" : "늘었습니다"}`,
        description: `${opposite.name} 매출 ${formatKRW(opposite.prev)} → ${formatKRW(opposite.cur)}(${signedKRW(opposite.delta)}).${
          dom && factors ? ` ${josa(factorLine(factors), "으로")}, ${josa(factorPhrase(dom), "이")} 가장 컸습니다.` : ""
        }`,
        evidence: factors ? factors.map((f) => `${f.label} ${f.text} (${signed(f.pct)})`) : [`${opposite.name} ${signed(opposite.pct)}`],
        basis: factors ? (factors[0].key === "visitors" ? BASIS.factor : BASIS.factorOrders) : BASIS.compare,
        impact: down ? "negative" : "positive",
        drill: dimTarget(dim, opposite.name),
      });
    }
  }

  // 3) 요인 — 전체 매출 변화가 방문자·전환율·객단가 중 어디서 나왔나
  if (comparable) {
    const factors = decompose(total.cur, total.prev, derived);
    const dom = dominantFactor(factors);
    if (factors && dom) {
      const up = total.cur.revenue >= total.prev.revenue;
      insights.push({
        id: "factor",
        category: "변화 요인",
        title: `매출 ${up ? "증가" : "감소"}는 주로 ${factorPhrase(dom)}에서 나왔습니다`,
        description: `${factorLine(factors)}. ${dom.label} 변화가 매출 변화의 ${Math.min(100, Math.round(dom.share))}%가량을 설명합니다.`,
        evidence: factors.map((f) => `${f.label} ${f.text} (${signed(f.pct)})`),
        basis: factors[0].key === "visitors" ? BASIS.factor : BASIS.factorOrders,
        impact: up ? "positive" : "negative",
        drill: { metric: FACTOR_METRIC[dom.key] },
      });
    }
  }

  // 4) 광고비가 늘어난 만큼 주문이 늘지 않은 채널
  const ads = adEfficiency(rows, filters, derived);
  const weak = weakAdSpend(ads);
  if (weak) {
    insights.push({
      id: "ad-weak",
      category: "광고 효율",
      title: `${weak.channel} 광고비는 ${weak.adPct.toFixed(0)}% 늘었지만 주문은 ${
        weak.ordersPct >= 0 ? `${weak.ordersPct.toFixed(0)}% 증가에 그쳤습니다` : `오히려 ${Math.abs(weak.ordersPct).toFixed(0)}% 줄었습니다`
      }`,
      description: `광고비 ${formatKRW(weak.adPrev)} → ${formatKRW(weak.adCur)}(${signedKRW(weak.adCur - weak.adPrev)}). 광고비 1원당 매출이 ${weak.roasPrev.toFixed(1)}원에서 ${weak.roasCur.toFixed(1)}원으로 낮아졌습니다.`,
      evidence: [
        `광고비 ${signed(weak.adPct)}`,
        `주문 수 ${signed(weak.ordersPct)}`,
        `매출 ${signed(weak.revenuePct)}`,
        `광고비 1원당 매출 ${weak.roasPrev.toFixed(1)}원 → ${weak.roasCur.toFixed(1)}원`,
      ],
      basis: BASIS.ad,
      impact: "negative",
      drill: { channel: weak.channel, metric: "orders" },
    });
  }

  // 5) 상품 흐름 — 최근 7일이 평소보다 크게 많거나 적은 상품
  const momentum = productMomentum(rows, filters, derived);
  const rising = momentum.find((m) => m.pct >= 15);
  const falling = [...momentum].reverse().find((m) => m.pct <= -15);
  for (const m of [rising, falling]) {
    if (!m) continue;
    const up = m.pct > 0;
    insights.push({
      id: up ? "product-rising" : "product-falling",
      category: "상품 흐름",
      title: `'${m.product}' 최근 7일 판매가 평소보다 ${Math.abs(m.pct).toFixed(0)}% ${up ? "많습니다" : "적습니다"}`,
      description: `최근 7일 ${unitText(m, m.recent)}, 그 전 3주는 한 주에 ${unitText(m, m.base)} 수준이었습니다.`,
      evidence: [`최근 7일 ${unitText(m, m.recent)}`, `그 전 3주 주간 중앙값 ${unitText(m, m.base)}`],
      basis: BASIS.momentum,
      impact: up ? "positive" : "negative",
      drill: { product: m.product, metric: m.unit === "orders" ? "orders" : "revenue" },
    });
  }

  // 6) 재구매 고객 비중 변화(고객 컬럼이 실제 값일 때만)
  const realCustomers = !derived.includes("customers") && !derived.includes("returningCustomers");
  if (comparable && realCustomers && total.cur.customers > 0 && total.prev.customers > 0) {
    const cur = (total.cur.returning / total.cur.customers) * 100;
    const prev = (total.prev.returning / total.prev.customers) * 100;
    if (Math.abs(cur - prev) >= 2) {
      const up = cur > prev;
      insights.push({
        id: "repeat-share",
        category: "고객",
        title: `재구매 고객 비중이 ${prev.toFixed(0)}%에서 ${cur.toFixed(0)}%로 ${up ? "올랐습니다" : "내려갔습니다"}`,
        description: `이번 기간 구매 고객 ${formatNumber(total.cur.customers)}명 중 ${formatNumber(total.cur.returning)}명이 재구매 고객입니다.`,
        evidence: [`재구매 비중 ${prev.toFixed(1)}% → ${cur.toFixed(1)}%`, `재구매 고객 ${formatNumber(total.prev.returning)}명 → ${formatNumber(total.cur.returning)}명`],
        basis: BASIS.compare.replace("매출", "고객 수"),
        impact: up ? "positive" : "negative",
        drill: { metric: "customers" },
      });
    }
  }

  // 7) 채널별 광고비 1원당 매출 차이(‘기타’ 채널 제외, 1.3배 이상 차이일 때)
  const roas = ads.filter((a) => a.channel !== "기타").sort((a, b) => b.roasCur - a.roasCur);
  if (roas.length >= 2 && roas[0].roasCur >= roas[roas.length - 1].roasCur * 1.3) {
    const best = roas[0];
    const worst = roas[roas.length - 1];
    insights.push({
      id: "ad-roas",
      category: "광고 효율",
      title: `광고비 1원당 매출은 ${josa(best.channel, "이")} ${worst.channel}의 ${(best.roasCur / worst.roasCur).toFixed(1)}배입니다`,
      description: `최근 ${n}일 광고비 1원당 매출: ${best.channel} ${best.roasCur.toFixed(1)}원, ${worst.channel} ${worst.roasCur.toFixed(1)}원.`,
      evidence: roas.map((a) => `${a.channel} ${a.roasCur.toFixed(1)}원 (광고비 ${formatKRW(a.adCur)})`),
      basis: "기간 합계 매출 ÷ 기간 합계 광고비",
      impact: "neutral",
      drill: { channel: worst.channel, metric: "revenue" },
    });
  }

  // 8) 비교할 이전 기간이 없으면 기간 안의 흐름이라도 말한다
  if (!comparable) {
    const h = halfTrend(rows, filters);
    if (h && Math.abs(h.pct) >= 3) {
      const up = h.pct > 0;
      insights.push({
        id: "half-trend",
        category: "기간 안 흐름",
        title: `기간 후반 ${h.days}일 매출이 전반보다 ${Math.abs(h.pct).toFixed(0)}% ${up ? "많습니다" : "적습니다"}`,
        description: `전반 ${h.days}일 ${formatKRW(h.first)}, 후반 ${h.days}일 ${formatKRW(h.second)}. 이전 같은 기간 데이터가 없어 기간 안에서 비교했습니다.`,
        evidence: [`전반 ${formatKRW(h.first)}`, `후반 ${formatKRW(h.second)}`],
        basis: BASIS.half,
        impact: up ? "positive" : "negative",
        drill: { metric: "revenue" },
      });
    }
  }

  return insights;
}

const RANK = { high: 0, medium: 1, low: 2 } as const;

/** 요인별로 무엇을 확인하면 되는지 */
const CHECK_BY_FACTOR: Record<FactorChange["key"], string> = {
  visitors: "유입 경로(광고·검색 노출·외부 링크)별 방문자 변화를 먼저 확인하세요.",
  conversion: "상세페이지·장바구니·결제 단계에서 이탈이 늘었는지, 가격·배송비가 바뀌었는지 확인하세요.",
  aov: "할인·쿠폰 적용률과 고가 상품의 판매 비중이 바뀌었는지 확인하세요.",
  orders: "판매 채널의 노출 위치와 재고 상태가 바뀌었는지 확인하세요.",
};
const KEEP_BY_FACTOR: Record<FactorChange["key"], string> = {
  visitors: "방문자를 늘린 유입 경로(광고·검색·제휴)의 예산과 노출을 유지하세요.",
  conversion: "최근 바꾼 상세페이지·결제 흐름·광고 문구를 기록하고 다른 채널에도 적용할 수 있는지 검토하세요.",
  aov: "객단가를 올린 구성(묶음·고가 상품 노출)을 다른 채널에도 적용해보세요.",
  orders: "주문을 늘린 노출·프로모션 조건을 기록해 두고 유지하세요.",
};

/**
 * 실행 제안 — 각 제안은 특정 인사이트·이상치에서 나오고, 그 계산값을 근거로 단다.
 * 근거 없는 일반론(예: "마케팅을 강화하세요")이나 효과 수치 추정은 만들지 않는다.
 */
export function generateRecommendations(ctx: Context, anomalies: Anomaly[] = []): Recommendation[] {
  const insights = generateInsights(ctx);
  const recs: Recommendation[] = [];
  const byId = (id: string) => insights.find((i) => i.id === id);

  // 1) 아직 이어지고 있거나 가장 최근의 위험·주의 이상치
  const end = resolveDates(ctx.rows, ctx.filters).currentDates.at(-1) ?? "";
  const alert = [...anomalies]
    .filter((a) => a.direction === "down" && a.severity !== "info")
    .sort((a, b) => urgency(b, end) - urgency(a, end))[0];
  if (alert) {
    const d = diagnose(alert);
    recs.push({
      id: "rec-anomaly",
      title: `${formatMonthDay(alert.date)} ${alert.channel ?? "전체"} ${d.short} 원인 확인`,
      description: d.steps[0],
      evidence: `${alert.description}${alert.ongoing ? " 아직 평소 수준으로 돌아오지 않았습니다." : ""}`,
      priority: alert.ongoing || alert.severity === "critical" ? "high" : "medium",
      link: { kind: "anomaly", id: alert.id },
    });
  }

  // 2) 줄어든 채널·상품 — 요인에 맞춰 무엇을 볼지
  for (const id of ["driver", "counter-trend"]) {
    const ins = byId(id);
    if (!ins || ins.impact !== "negative" || !ins.drill) continue;
    const name = ins.drill.channel ?? ins.drill.product!;
    const dom = dominantFactor(segmentFactors(ctx, ins.drill));
    recs.push({
      id: `rec-${id}`,
      title: `${name} 매출 감소 원인 점검`,
      description: dom ? CHECK_BY_FACTOR[dom.key] : CHECK_BY_FACTOR.orders,
      evidence: ins.title,
      priority: "high",
      link: { kind: "segment", ...ins.drill },
    });
  }

  // 3) 광고비 증액분 점검
  const weak = byId("ad-weak");
  if (weak?.drill?.channel) {
    recs.push({
      id: "rec-ad-weak",
      title: `${weak.drill.channel} 광고 증액분 성과 점검`,
      description: "늘린 캠페인·키워드별 주문 전환을 확인하고, 주문이 따라오지 않은 집행은 이전 수준으로 되돌리세요.",
      evidence: weak.title,
      priority: "high",
      link: { kind: "segment", channel: weak.drill.channel, metric: "orders" },
    });
  }

  // 4) 상품 흐름
  const rising = byId("product-rising");
  if (rising?.drill?.product) {
    const m = productMomentum(ctx.rows, ctx.filters, ctx.derived).find((x) => x.product === rising.drill!.product);
    recs.push({
      id: "rec-stock",
      title: `'${rising.drill.product}' 재고와 노출 확보`,
      description:
        m && m.unit === "orders"
          ? `지금 속도라면 다음 7일에 약 ${formatNumber(m.recentOrders)}건이 팔립니다(최근 7일 기준 추정). 재고가 그만큼 있는지 확인하세요.`
          : "판매 속도가 빨라졌습니다. 품절되지 않게 재고를 확인하고 노출 위치를 유지하세요.",
      evidence: rising.title,
      priority: "medium",
      link: { kind: "segment", product: rising.drill.product, metric: rising.drill.metric },
    });
  }
  const falling = byId("product-falling");
  if (falling?.drill?.product) {
    recs.push({
      id: "rec-product-falling",
      title: `'${falling.drill.product}' 판매 둔화 원인 확인`,
      description: "최근 가격·재고·노출 위치·리뷰에 바뀐 점이 있는지 확인하세요.",
      evidence: falling.title,
      priority: "medium",
      link: { kind: "segment", product: falling.drill.product, metric: falling.drill.metric },
    });
  }

  // 5) 늘어난 채널의 성장 요인 유지
  const driver = byId("driver");
  if (driver?.impact === "positive" && driver.drill) {
    const dom = dominantFactor(segmentFactors(ctx, driver.drill));
    if (dom) {
      const name = driver.drill.channel ?? driver.drill.product!;
      recs.push({
        id: "rec-keep",
        title: `${name}의 ${factorPhrase(dom)} 요인 유지`,
        description: KEEP_BY_FACTOR[dom.key],
        evidence: `${driver.title} (${dom.label} ${signed(dom.pct)})`,
        priority: "medium",
        link: { kind: "segment", ...driver.drill, metric: FACTOR_METRIC[dom.key] },
      });
    }
  }

  // 6) 재구매 비중 하락
  const repeat = byId("repeat-share");
  if (repeat?.impact === "negative") {
    recs.push({
      id: "rec-retention",
      title: "첫 구매 고객의 재구매 안내 점검",
      description: "최근 첫 구매 고객에게 재구매 안내(쿠폰·알림)가 나가고 있는지 확인하세요.",
      evidence: repeat.title,
      priority: "low",
      link: { kind: "segment", metric: "customers" },
    });
  }

  // 7) 채널 간 광고 효율 차이(증액 점검 제안이 없을 때만)
  const roas = byId("ad-roas");
  if (roas?.drill?.channel && !weak) {
    recs.push({
      id: "rec-budget",
      title: `${roas.drill.channel} 광고 중 성과 낮은 집행부터 정리`,
      description: "예산을 옮기기 전에, 이 채널에서 주문이 없던 캠페인·키워드부터 줄이는 안을 검토하세요.",
      evidence: roas.title,
      priority: "low",
      link: { kind: "segment", channel: roas.drill.channel, metric: "revenue" },
    });
  }

  return recs.sort((a, b) => RANK[a.priority] - RANK[b.priority]).slice(0, 4);
}

/** 기간 설명 — "최근 30일" */
export function spanLabel(rows: DataRow[], filters: Filters): string {
  const n = resolveDates(rows, filters).currentDates.length;
  return filters.preset === "custom" ? `선택한 ${n}일` : `최근 ${n}일`;
}

export type { Contribution };
