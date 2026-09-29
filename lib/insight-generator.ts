import { applyFilters, channelShares, dailySeries, exploreSeries, resolveDates, uniqueDates } from "./analytics-engine";
import { formatKRW, formatKRWExact } from "./format";
import { DataRow, Filters, Insight, Recommendation } from "./types";

export const DEFAULT_FILTERS: Filters = {
  preset: "30",
  rangeDays: 30,
  channel: "all",
  product: "all",
};

interface Context {
  rows: DataRow[];
  filters: Filters;
}

/** 데이터에서 계산된 값 기반으로 규칙형 인사이트를 생성한다. (LLM 연결 시 이 결과를 프롬프트 컨텍스트로 사용) */
export function generateInsights({ rows, filters }: Context): Insight[] {
  const insights: Insight[] = [];
  const shares = channelShares(rows, filters);
  const { current, currentDates } = applyFilters(rows, filters);

  // 1) 매출 상승/하락 요인: 비중 변화가 가장 큰 채널
  const mover = [...shares].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))[0];
  if (mover && Math.abs(mover.changePct) >= 0.5) {
    const up = mover.changePct > 0;
    insights.push({
      id: "channel-mix",
      category: up ? "매출 상승 요인" : "채널 변화",
      title: `${mover.channel} 채널 비중 ${up ? "확대" : "축소"}`,
      description: `${mover.channel} 채널의 매출 비중이 전 기간 대비 ${Math.abs(mover.changePct).toFixed(1)}%p ${up ? "증가" : "감소"}했습니다.`,
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
  if (newAov > 0 && retAov > 0 && Math.abs(((retAov - newAov) / newAov) * 100) >= 5) {
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
  if (topProduct && topProduct.pct > 5) {
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
  if (Math.abs(convDelta) >= 3) {
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
      description: `${product.title.split("'")[1] ? `'${product.title.split("'")[1]}'` : "성장 상품"}의 판매량이 최근 2주간 빠르게 증가했습니다. 재고와 상세페이지 노출을 강화하세요.`,
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
  if (recs.length < 3) {
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
export function answerDataQuestion(question: string, rows: DataRow[]): string {
  const q = question.toLowerCase();
  const filters = DEFAULT_FILTERS;
  const shares = channelShares(rows, filters);
  const { current, previous } = applyFilters(rows, filters);
  const curRev = current.reduce((a, r) => a + r.revenue, 0);
  const prevRev = previous.reduce((a, r) => a + r.revenue, 0);

  if (/(잘\s*팔|인기|베스트|많이\s*팔)/.test(q) || (q.includes("상품") && q.includes("최고"))) {
    const top = exploreSeries(rows, filters, "revenue", "product")[0];
    return top
      ? `최근 30일 기준 가장 잘 팔린 상품은 '${top.name}'입니다. 해당 상품 매출은 ${formatKRW(top.value)}로 전체 상품 중 1위입니다.`
      : "상품 데이터가 충분하지 않습니다.";
  }
  if (/(광고|roas|효율)/.test(q)) {
    const roas = shares
      .filter((s) => s.channel !== "기타")
      .map((s) => {
        const ad = current.filter((r) => r.channel === s.channel).reduce((a, r) => a + r.adSpend, 0);
        return { channel: s.channel, roas: ad > 0 ? s.revenue / ad : 0 };
      })
      .sort((a, b) => b.roas - a.roas)[0];
    return roas
      ? `광고 효율(ROAS)이 가장 높은 채널은 ${roas.channel}입니다. 최근 30일 광고비 대비 ${roas.roas.toFixed(1)}배의 매출을 만들었습니다.`
      : "광고비 데이터가 없어 효율을 계산할 수 없습니다.";
  }
  if (/(재구매|리텐션|단골)/.test(q)) {
    const curRet = current.reduce((a, r) => a + r.returningCustomers, 0);
    const curAll = current.reduce((a, r) => a + r.customers, 0);
    const prevRet = previous.reduce((a, r) => a + r.returningCustomers, 0);
    const prevAll = previous.reduce((a, r) => a + r.customers, 0);
    const curRate = curAll > 0 ? (curRet / curAll) * 100 : 0;
    const prevRate = prevAll > 0 ? (prevRet / prevAll) * 100 : 0;
    return `최근 30일 재구매 고객 비중은 ${curRate.toFixed(1)}%로, 이전 30일(${prevRate.toFixed(1)}%) 대비 ${(curRate - prevRate).toFixed(1)}%p ${curRate >= prevRate ? "상승" : "하락"}했습니다.`;
  }
  if (/(다음\s*주|예상|예측|전망)/.test(q)) {
    const dates = uniqueDates(rows);
    const daily = dailySeries(rows, dates);
    const recent = daily.slice(-14).reduce((a, p) => a + p.revenue, 0) / 14;
    const prev14 = daily.slice(-28, -14).reduce((a, p) => a + p.revenue, 0) / 14;
    const g = prev14 > 0 ? (recent - prev14) / prev14 : 0;
    const next7 = recent * 7 * (1 + Math.max(-0.15, Math.min(0.2, g / 2)));
    return `최근 14일 추세를 반영하면 다음 7일 매출은 약 ${formatKRW(next7)} 수준으로 예상됩니다. 최근 2주 일평균 매출이 직전 2주 대비 ${(g * 100).toFixed(1)}% ${g >= 0 ? "증가" : "감소"}한 흐름을 반영한 수치입니다.`;
  }
  if (/(떨어|하락|감소|왜)/.test(q) && /(매출|주문)/.test(q)) {
    const drop = [...shares].sort((a, b) => a.changePct - b.changePct)[0];
    const totalDelta = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
    if (totalDelta >= 0) {
      return `최근 30일 매출은 이전 기간 대비 ${totalDelta.toFixed(1)}% 증가해 하락 구간은 아닙니다. 다만 ${drop?.channel ?? "일부"} 채널의 비중이 ${Math.abs(drop?.changePct ?? 0).toFixed(1)}%p 줄어 해당 채널의 유입·전환 점검을 권장합니다.`;
    }
    return `최근 30일 매출은 이전 기간 대비 ${Math.abs(totalDelta).toFixed(1)}% 감소했습니다. 가장 큰 요인은 ${drop?.channel ?? "주요"} 채널의 매출 비중 하락(${Math.abs(drop?.changePct ?? 0).toFixed(1)}%p)으로, 해당 채널의 신규 고객 전환율 감소가 영향을 준 것으로 보입니다.`;
  }
  if (/(채널|비중)/.test(q)) {
    const top = shares[0];
    return top
      ? `최근 30일 기준 매출 비중이 가장 큰 채널은 ${top.channel}(${top.share.toFixed(1)}%)입니다. 전 기간 대비 비중이 ${Math.abs(top.changePct).toFixed(1)}%p ${top.changePct >= 0 ? "증가" : "감소"}했습니다.`
      : "채널 데이터가 없습니다.";
  }
  // 기본 요약 응답
  const delta = prevRev > 0 ? ((curRev - prevRev) / prevRev) * 100 : 0;
  return `최근 30일 매출은 ${formatKRW(curRev)}로 이전 기간 대비 ${Math.abs(delta).toFixed(1)}% ${delta >= 0 ? "증가" : "감소"}했습니다. 자세한 내용은 "가장 잘 팔린 상품은?", "광고 효율이 가장 높은 채널은?"처럼 질문해보세요.`;
}

export const SUGGESTED_QUESTIONS = [
  "지난달 매출이 왜 떨어졌어?",
  "가장 잘 팔린 상품은?",
  "광고 효율이 가장 높은 채널은?",
  "재구매율은 어떻게 변했어?",
  "다음주 매출을 예상해줘",
];
