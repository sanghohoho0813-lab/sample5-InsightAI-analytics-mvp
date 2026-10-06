import { applyFilters, channelShares, dailySeries, exploreSeries, isComparable, resolveDates, uniqueDates } from "./analytics-engine";
import { formatKRW, formatKRWExact } from "./format";
import { computeForecasts, FORECAST_MIN_DAYS } from "./forecast-engine";
import { DataRow, DerivedField, Filters, Insight, Recommendation } from "./types";

/** 데이터 질의 기준 범위 — 전체 채널·최근 30일 */
const QA_FILTERS: Filters = {
  preset: "30",
  rangeDays: 30,
  channel: "all",
  product: "all",
};

interface Context {
  rows: DataRow[];
  filters: Filters;
  /** 업로드 파일에서 추정으로 채운 필드 — 이 값에 기대는 인사이트는 만들지 않는다 */
  derived?: DerivedField[];
}

/** 데이터에서 계산된 값 기반으로 규칙형 인사이트를 생성한다. (LLM 연결 시 이 결과를 프롬프트 컨텍스트로 사용) */
export function generateInsights({ rows, filters, derived = [] }: Context): Insight[] {
  const insights: Insight[] = [];
  const shares = channelShares(rows, filters);
  const { current, currentDates } = applyFilters(rows, filters);
  const comparable = isComparable(rows, filters);
  const estimated = (f: DerivedField) => derived.includes(f);

  // 1) 매출 상승/하락 요인: 비중 변화가 가장 큰 채널 (채널이 2개 이상이고 이전 기간이 있을 때)
  const mover = [...shares].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  if (comparable && shares.length > 1 && mover && Math.abs(mover.changePct) >= 1) {
    const up = mover.changePct > 0;
    insights.push({
      id: "channel-mix",
      category: up ? "매출 상승 요인" : "채널 변화",
      title: `${mover.channel} 채널 비중 ${up ? "확대" : "축소"}`,
      description: `${mover.channel} 채널의 매출 비중이 이전 기간보다 ${Math.abs(mover.changePct).toFixed(1)}%p ${up ? "증가" : "감소"}했습니다.`,
      detail: `현재 ${mover.channel} 채널은 전체 매출의 ${mover.share.toFixed(1)}%(${formatKRW(mover.revenue)})를 차지합니다. ${up ? "해당 채널의 전환 흐름이 개선되고 있어 예산 확대를 검토할 만합니다." : "유입 또는 전환 단계에서 이탈 요인을 점검해보세요."}`,
      impact: up ? "positive" : "negative",
      drill: { channel: mover.channel, metric: "revenue" },
    });
  }

  // 2) 고객 행동: 재구매 비중이 높은 구간 vs 낮은 구간의 객단가 비교 (재구매/신규 객단가 추정)
  let newCus = 0, retCus = 0;
  for (const r of current) {
    newCus += r.newCustomers;
    retCus += r.returningCustomers;
  }
  const withShare = current
    .filter((r) => r.customers > 0 && r.orders > 0)
    .map((r) => ({ aov: r.aov, share: r.returningCustomers / r.customers, w: r.orders }));
  const sortedShare = [...withShare].sort((a, b) => a.share - b.share);
  const medShare = sortedShare[Math.floor(sortedShare.length / 2)]?.share ?? 0;
  const wavg = (arr: { aov: number; w: number }[]) => {
    const w = arr.reduce((a, x) => a + x.w, 0);
    return w > 0 ? arr.reduce((a, x) => a + x.aov * x.w, 0) / w : 0;
  };
  const retAov = wavg(withShare.filter((x) => x.share > medShare));
  const newAov = wavg(withShare.filter((x) => x.share <= medShare));
  const hasCustomerData = !estimated("customers") && !estimated("returningCustomers") && !estimated("orders");
  if (hasCustomerData && newAov > 0 && retAov > 0 && Math.abs(((retAov - newAov) / newAov) * 100) >= 5) {
    const diff = ((retAov - newAov) / newAov) * 100;
    insights.push({
      id: "customer-behavior",
      category: "고객 행동 변화",
      title: `재구매 고객 객단가가 신규 대비 ${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? "높음" : "낮음"}`,
      description: `재구매 고객의 평균 주문액(추정 ${formatKRWExact(retAov)})이 신규 고객(${formatKRWExact(newAov)})보다 ${Math.abs(diff).toFixed(0)}% ${diff >= 0 ? "높습니다" : "낮습니다"}.`,
      detail: `이번 기간 재구매 고객은 ${Math.round(retCus).toLocaleString("ko-KR")}명으로 전체 구매 고객의 ${((retCus / (newCus + retCus)) * 100).toFixed(0)}%입니다. ${diff >= 0 ? "재구매 고객 대상 CRM 캠페인의 기대 효율이 높습니다." : "재구매 고객의 구매 단가를 높일 번들 구성이 필요해 보입니다."}`,
      impact: diff >= 0 ? "positive" : "neutral",
      drill: { metric: "aov" },
    });
  }

  // 3) 마케팅 성과: 광고비 대비 매출(ROAS)이 가장 높은 채널 ('기타' 채널은 비교에서 제외)
  const roas = shares
    .filter((s) => s.channel !== "기타")
    .map((s) => {
      const ad = current.filter((r) => r.channel === s.channel).reduce((a, r) => a + r.adSpend, 0);
      return { channel: s.channel, roas: ad > 0 ? s.revenue / ad : 0 };
    })
    .filter((s) => s.roas > 0)
    .sort((a, b) => b.roas - a.roas);
  if (roas.length >= 2) {
    const best = roas[0];
    const worst = roas[roas.length - 1];
    insights.push({
      id: "marketing-roi",
      category: "마케팅 성과",
      title: `${best.channel} 유입의 광고 효율이 가장 높음`,
      description: `${best.channel} 채널의 광고비 대비 매출(ROAS)이 ${best.roas.toFixed(1)}배로, ${worst.channel}(${worst.roas.toFixed(1)}배)보다 높습니다.`,
      detail: `동일 예산 기준 ${best.channel} 채널의 기대 매출이 ${(best.roas / Math.max(0.1, worst.roas)).toFixed(1)}배 높습니다. 저효율 채널 예산 일부를 이동하는 것을 검토해보세요.`,
      impact: "positive",
      drill: { channel: best.channel, metric: "revenue" },
    });
  }

  // 4) 제품 인사이트: 선택 기간 내 최근 절반 vs 직전 절반 성장률 최고 상품
  const { currentDates: scopeDates } = resolveDates(rows, filters);
  const half = Math.max(1, Math.floor(scopeDates.length / 2));
  const recent = new Set(scopeDates.slice(-half));
  const before = new Set(scopeDates.slice(-half * 2, -half));
  const growth = new Map<string, { rec: number; bef: number }>();
  for (const r of rows) {
    if (!growth.has(r.product)) growth.set(r.product, { rec: 0, bef: 0 });
    const g = growth.get(r.product)!;
    if (recent.has(r.date)) g.rec += r.revenue;
    else if (before.has(r.date)) g.bef += r.revenue;
  }
  const productGrowth = Array.from(growth.entries())
    .map(([product, g]) => ({ product, pct: g.bef > 0 ? ((g.rec - g.bef) / g.bef) * 100 : 0, rec: g.rec }))
    .sort((a, b) => b.pct - a.pct);
  const topProduct = productGrowth[0];
  const growthLabel = `최근 ${half}일`;
  if (growth.size > 1 && topProduct && topProduct.pct > 5) {
    insights.push({
      id: "product-growth",
      category: "제품 인사이트",
      title: `'${topProduct.product}' 판매 증가율 ${growthLabel} 1위`,
      description: `'${topProduct.product}'의 매출이 직전 ${half}일 대비 ${topProduct.pct.toFixed(0)}% 증가하며 가장 빠르게 성장하고 있습니다.`,
      detail: `${growthLabel} 매출은 ${formatKRW(topProduct.rec)}입니다. 수요 증가 속도를 고려해 재고와 노출 지면을 미리 확보하는 것이 좋습니다.`,
      impact: "positive",
      drill: { product: topProduct.product, metric: "revenue" },
    });
  }

  // 5) 전환율 추세
  const daily = dailySeries(current, currentDates);
  const mid = Math.floor(daily.length / 2);
  const convA = daily.slice(0, mid).reduce((a, p) => a + p.conversionRate, 0) / Math.max(1, mid);
  const convB = daily.slice(mid).reduce((a, p) => a + p.conversionRate, 0) / Math.max(1, daily.length - mid);
  const convDelta = convA > 0 ? ((convB - convA) / convA) * 100 : 0;
  if (!estimated("visitors") && !estimated("orders") && daily.length >= 6 && Math.abs(convDelta) >= 3) {
    insights.push({
      id: "conversion-trend",
      category: "전환 추세",
      title: `기간 후반 전환율 ${convDelta >= 0 ? "개선" : "하락"}`,
      description: `기간 후반부 평균 전환율(${convB.toFixed(2)}%)이 전반부(${convA.toFixed(2)}%) 대비 ${Math.abs(convDelta).toFixed(0)}% ${convDelta >= 0 ? "개선됐습니다" : "하락했습니다"}.`,
      detail: convDelta >= 0
        ? "최근 유입 품질 또는 구매 경로 개선 효과가 나타나고 있습니다. 변화 시점의 캠페인·UX 변경 사항을 기록해두세요."
        : "결제 단계 이탈, 유입 품질 저하 여부를 우선 점검해보세요.",
      impact: convDelta >= 0 ? "positive" : "negative",
      drill: { metric: "conversion" },
    });
  }

  return insights;
}

export function generateRecommendations(ctx: Context): Recommendation[] {
  const insights = generateInsights(ctx);
  const recs: Recommendation[] = [];

  if (insights.some((i) => i.id === "customer-behavior" && i.impact === "positive")) {
    recs.push({
      id: "rec-crm",
      title: "프로모션 최적화",
      description: "객단가가 높은 재구매 고객을 대상으로 할인 쿠폰·전용 혜택을 발송해보세요.",
      expectedEffect: "매출 +4~7%",
      priority: "high",
    });
  }
  const roi = insights.find((i) => i.id === "marketing-roi");
  if (roi) {
    recs.push({
      id: "rec-budget",
      title: "광고 예산 조정",
      description: `저효율 채널 예산 일부를 ${roi.title.replace(" 유입의 광고 효율이 가장 높음", "")} 채널로 이동하는 것을 검토하세요.`,
      expectedEffect: "ROAS +10~15%",
      priority: "high",
    });
  }
  const product = insights.find((i) => i.id === "product-growth");
  if (product) {
    recs.push({
      id: "rec-stock",
      title: "재고 확보",
      description: `${product.title.split("'")[1] ? `'${product.title.split("'")[1]}'` : "성장 상품"} 매출이 상품 중 가장 빠르게 늘고 있습니다. 품절되지 않게 재고를 확보하고 노출을 늘리세요.`,
      expectedEffect: "품절 리스크 감소",
      priority: "medium",
    });
  }
  const conv = insights.find((i) => i.id === "conversion-trend");
  if (conv?.impact === "negative") {
    recs.push({
      id: "rec-funnel",
      title: "구매 퍼널 점검",
      description: "전환율 하락 구간의 결제 단계 로그를 확인하고, 간편결제 노출을 우선 검토하세요.",
      expectedEffect: "전환율 +0.3~0.6%p",
      priority: "high",
    });
  }
  // 고객 데이터가 실제로 있을 때만 일반 리텐션 제안을 덧붙인다.
  const hasCustomers = !(ctx.derived ?? []).some((f) => f === "customers" || f === "returningCustomers");
  if (recs.length < 3 && hasCustomers) {
    recs.push({
      id: "rec-retention",
      title: "리텐션 캠페인 준비",
      description: "최근 30일 첫 구매 고객에게 2차 구매 유도 메시지를 예약 발송해보세요.",
      expectedEffect: "재구매율 +2~3%p",
      priority: "low",
    });
  }
  return recs.slice(0, 4);
}

/** 자연어 질의 데모 엔진: 질문 키워드를 해석해 실제 데이터를 계산해 답한다. */
export function answerDataQuestion(question: string, rows: DataRow[], derived: DerivedField[] = []): string {
  const q = question.toLowerCase();
  const filters = QA_FILTERS;
  const shares = channelShares(rows, filters);
  const { current, previous, currentDates } = applyFilters(rows, filters);
  const comparable = isComparable(rows, filters);
  const span = `최근 ${currentDates.length}일`;
  const curRev = current.reduce((a, r) => a + r.revenue, 0);
  const prevRev = previous.reduce((a, r) => a + r.revenue, 0);
  const noCompare = "이전 같은 기간의 데이터가 없어 증감은 비교할 수 없습니다.";

  if (/(잘\s*팔|인기|베스트|많이\s*팔)/.test(q) || (q.includes("상품") && q.includes("최고"))) {
    const ranked = exploreSeries(rows, filters, "revenue", "product");
    if (ranked.length < 2) return "상품 구분이 없는 데이터라 상품별 순위를 계산할 수 없습니다.";
    const top = ranked[0];
    const share = (top.value / ranked.reduce((a, r) => a + r.value, 0)) * 100;
    return `${span} 기준 가장 잘 팔린 상품은 '${top.name}'입니다. 매출 ${formatKRW(top.value)}로 전체의 ${share.toFixed(0)}%를 차지합니다.`;
  }
  if (/(광고|roas|효율)/.test(q)) {
    if (derived.includes("adSpend")) return "광고비 컬럼이 없는 데이터라 광고 효율을 계산할 수 없습니다.";
    const roas = shares
      .filter((s) => s.channel !== "기타")
      .map((s) => {
        const ad = current.filter((r) => r.channel === s.channel).reduce((a, r) => a + r.adSpend, 0);
        return { channel: s.channel, roas: ad > 0 ? s.revenue / ad : 0 };
      })
      .filter((s) => s.roas > 0)
      .sort((a, b) => b.roas - a.roas)[0];
    return roas
      ? `광고 효율(ROAS)이 가장 높은 채널은 ${roas.channel}입니다. ${span} 광고비 대비 ${roas.roas.toFixed(1)}배의 매출을 만들었습니다.`
      : "광고비 데이터가 없어 효율을 계산할 수 없습니다.";
  }
  if (/(재구매|리텐션|단골)/.test(q)) {
    if (derived.includes("returningCustomers") || derived.includes("customers"))
      return "재구매 고객 컬럼이 없는 데이터라 재구매율을 계산할 수 없습니다.";
    const rate = (list: DataRow[]) => {
      const ret = list.reduce((a, r) => a + r.returningCustomers, 0);
      const all = list.reduce((a, r) => a + r.customers, 0);
      return all > 0 ? (ret / all) * 100 : 0;
    };
    const curRate = rate(current);
    if (!comparable) return `${span} 재구매 고객 비중은 ${curRate.toFixed(1)}%입니다. ${noCompare}`;
    const prevRate = rate(previous);
    return `${span} 재구매 고객 비중은 ${curRate.toFixed(1)}%로, 이전 같은 기간(${prevRate.toFixed(1)}%)보다 ${Math.abs(curRate - prevRate).toFixed(1)}%p ${curRate >= prevRate ? "올랐습니다" : "내렸습니다"}.`;
  }
  if (/(다음\s*주|예상|예측|전망)/.test(q)) {
    // 예측 화면과 같은 모델을 써서 숫자가 어긋나지 않게 한다.
    const f = computeForecasts(rows)[0];
    if (!f) return `예측하려면 최소 ${FORECAST_MIN_DAYS}일치 데이터가 필요합니다. 지금 데이터는 ${uniqueDates(rows).length}일치입니다.`;
    return `다음 7일 매출은 약 ${formatKRW(f.next7Total)}로 예상됩니다. 직전 7일보다 ${Math.abs(f.changePct).toFixed(1)}% ${f.changePct >= 0 ? "많은" : "적은"} 수준이며, 최근 14일 추세를 반영한 단순 모델의 추정치입니다.`;
  }
  if (/(떨어|하락|감소|왜)/.test(q) && /(매출|주문)/.test(q)) {
    if (!comparable) return `${span} 매출은 ${formatKRW(curRev)}입니다. ${noCompare}`;
    const totalDelta = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
    const drop = shares.length > 1 ? [...shares].sort((a, b) => a.changePct - b.changePct)[0] : null;
    if (totalDelta >= 0) {
      return `${span} 매출은 이전 같은 기간보다 ${totalDelta.toFixed(1)}% 늘어 하락 구간은 아닙니다.${
        drop && drop.changePct < 0 ? ` 다만 ${drop.channel} 채널의 비중이 ${Math.abs(drop.changePct).toFixed(1)}%p 줄어 유입·전환 점검을 권합니다.` : ""
      }`;
    }
    return `${span} 매출은 이전 같은 기간보다 ${Math.abs(totalDelta).toFixed(1)}% 줄었습니다.${
      drop ? ` 비중이 가장 많이 줄어든 채널은 ${drop.channel}(${Math.abs(drop.changePct).toFixed(1)}%p)입니다.` : ""
    }`;
  }
  if (/(채널|비중)/.test(q)) {
    if (shares.length < 2) return "채널 구분이 없는 데이터라 채널별 비중을 계산할 수 없습니다.";
    const top = shares[0];
    return `${span} 매출 비중이 가장 큰 채널은 ${top.channel}(${top.share.toFixed(1)}%)입니다.${
      comparable ? ` 이전 같은 기간보다 비중이 ${Math.abs(top.changePct).toFixed(1)}%p ${top.changePct >= 0 ? "늘었습니다" : "줄었습니다"}.` : ""
    }`;
  }
  // 기본 요약 응답
  const delta = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
  return `${span} 매출은 ${formatKRW(curRev)}${
    comparable ? `로 이전 같은 기간보다 ${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? "늘었습니다" : "줄었습니다"}` : "입니다"
  }. "가장 잘 팔린 상품은?", "광고 효율이 가장 높은 채널은?"처럼 물어보세요.`;
}

export const SUGGESTED_QUESTIONS = [
  "지난달 매출이 왜 떨어졌어?",
  "가장 잘 팔린 상품은?",
  "광고 효율이 가장 높은 채널은?",
  "재구매율은 어떻게 변했어?",
  "다음주 매출을 예상해줘",
];
