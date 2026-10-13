import { applyFilters, exploreSeries, filterDimensions, isComparable, resolveDates, uniqueDates } from "./analytics-engine";
import { summarize } from "./briefing";
import { canSplit, insightContext } from "./dataset-meta";
import { adEfficiency, contributions, pctChange, productMomentum, signed, signedKRW, sumRows } from "./drivers";
import { computeForecasts, FORECAST_MIN_DAYS } from "./forecast-engine";
import { formatKRW, formatMonthDay, formatNumber, josa } from "./format";
import { factorPhrase, segmentFactors } from "./insight-generator";
import { investigate } from "./investigate";
import { ActionLink, Anomaly, DemoDataset, Filters } from "./types";

/**
 * 데이터 질의(규칙 기반) — 질문을 의도로 나눠, 화면과 같은 계산으로 답한다.
 * 답은 항상 '결론 한두 문장 + 확인할 수 있는 근거 + 이어서 볼 화면'으로 구성한다.
 */

export type QaLink = ActionLink & { label: string };

export interface QaAnswer {
  text: string;
  evidence: string[];
  links: QaLink[];
  /** 어떤 범위로 계산했는지 — "최근 30일 · 전체 채널" */
  scope: string;
}

export interface Suggestion {
  question: string;
  /** 왜 이 질문을 추천하는지 */
  hint: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

function scopeText(ds: DemoDataset, filters: Filters): string {
  const n = resolveDates(ds.rows, filters).currentDates.length;
  const parts = [filters.preset === "custom" ? `선택한 ${n}일` : `최근 ${n}일`];
  parts.push(filters.channel === "all" ? "전체 채널" : filters.channel);
  if (filters.product !== "all") parts.push(filters.product);
  return parts.join(" · ");
}

/** "10월 2일", "10/2", "10.02" 같은 날짜 표현 → "MM-DD" */
function mentionedDay(q: string): string | null {
  const m = q.match(/(\d{1,2})\s*(?:월|[./-])\s*(\d{1,2})\s*일?/);
  return m ? `${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}

function anomalyAnswer(ds: DemoDataset, filters: Filters, a: Anomaly, scope: string): QaAnswer {
  const inv = investigate(ds, a, filters);
  return {
    text: inv
      ? `${inv.what} ${inv.timeline.text} ${inv.diagnosis.cause}`
      : `${formatMonthDay(a.date)} ${a.title}: ${a.description}`,
    evidence: inv
      ? [
          ...inv.evidence.filter((e) => e.flagged).map((e) => `${e.label} ${e.value} · 평소 ${e.expected} (${signed(e.deltaPct)})`),
          ...inv.breakdowns.map((b) => b.summary).filter(Boolean),
        ]
      : [a.detail],
    links: [{ kind: "anomaly", id: a.id, label: "이 변화 조사 화면 열기" }],
    scope,
  };
}

export function answerQuestion(question: string, ds: DemoDataset, filters: Filters): QaAnswer {
  const q = norm(question);
  const ctx = insightContext(ds, filters);
  const { rows, derived = [] } = ctx;
  const scope = scopeText(ds, filters);
  const comparable = isComparable(rows, filters);
  const b = summarize(ds, filters);
  const noCompare = "이전 같은 기간의 데이터가 없어 증감은 비교할 수 없습니다.";

  // 1) 특정 날짜·급변 — "10월 2일에 무슨 일이 있었어?", "급감한 날은?"
  const day = mentionedDay(question);
  if (day || /(무슨일|급감|급증|이상|튄|떨어진날|문제가있)/.test(q)) {
    const ch = ds.channels.find((c) => q.includes(norm(c)));
    const pool = ch ? b.anomalies.filter((a) => a.channel === ch || !a.channel) : b.anomalies;
    const hit = day
      ? pool.find((a) => a.date.slice(5) <= day && day <= a.endDate.slice(5))
      : (pool.find((a) => a.direction === "down") ?? pool[0]);
    if (hit) return anomalyAnswer(ds, filters, hit, scope);
    if (day) {
      return {
        text: `${Number(day.slice(0, 2))}월 ${Number(day.slice(3))}일에는 평소 수준에서 크게 벗어난 변화가 감지되지 않았습니다.`,
        evidence: [`${scope}에서 감지된 변화 ${b.anomalies.length}건`],
        links: [],
        scope,
      };
    }
  }

  // 2) 광고 효율 — 채널 이름이 함께 있으면 그 채널 중심으로
  if (/(광고|roas|효율)/.test(q)) {
    if (derived.includes("adSpend")) return { text: "광고비 컬럼이 없는 데이터라 광고 효율을 계산할 수 없습니다.", evidence: [], links: [], scope };
    const ads = adEfficiency(rows, filters, derived);
    if (!ads.length) {
      return { text: `광고 효율을 비교하려면 이전 같은 기간 데이터가 필요합니다. ${noCompare}`, evidence: [], links: [], scope };
    }
    const ranked = [...ads].filter((a) => a.channel !== "기타").sort((a, b2) => b2.roasCur - a.roasCur);
    const weak = b.insights.find((i) => i.id === "ad-weak");
    const best = ranked[0];
    const focus = ads.find((a) => q.includes(norm(a.channel)));
    if (focus) {
      const enough = focus.ordersPct >= focus.adPct - 15;
      return {
        text: `${focus.channel} 광고비는 이전 같은 기간보다 ${signed(focus.adPct)}, 주문은 ${signed(focus.ordersPct)} 변했습니다. ${
          enough ? "광고비 증감만큼 주문도 따라 움직였습니다." : "광고비가 늘어난 만큼 주문이 늘지 않았습니다."
        } 광고비 1원당 매출은 ${focus.roasPrev.toFixed(1)}원 → ${focus.roasCur.toFixed(1)}원입니다.`,
        evidence: [
          `광고비 ${formatKRW(focus.adPrev)} → ${formatKRW(focus.adCur)}`,
          `주문 수 ${signed(focus.ordersPct)} · 매출 ${signed(focus.revenuePct)}`,
          ...ranked.map((a) => `${a.channel} 1원당 ${a.roasCur.toFixed(1)}원`),
        ],
        links: [{ kind: "segment", channel: focus.channel, metric: "orders", label: `${focus.channel} 주문 추이 보기` }],
        scope,
      };
    }
    return {
      text: `광고비 1원당 매출이 가장 높은 채널은 ${best.channel}(${best.roasCur.toFixed(1)}원)입니다.${weak ? ` 반면 ${weak.title}.` : ""}`,
      evidence: ranked.map((a) => `${a.channel} 1원당 ${a.roasCur.toFixed(1)}원 · 광고비 ${formatKRW(a.adCur)} (${signed(a.adPct)})`),
      links: weak?.drill?.channel
        ? [{ kind: "segment", channel: weak.drill.channel, metric: "orders", label: `${weak.drill.channel} 주문 추이 보기` }]
        : [{ kind: "segment", channel: best.channel, metric: "revenue", label: `${best.channel}만 보기` }],
      scope,
    };
  }

  // 3) 특정 채널·상품을 이름으로 물은 경우 — "웹사이트 매출은 왜 늘었어?"
  const named =
    ds.channels.find((c) => canSplit(ds, "channel") && q.includes(norm(c))) ??
    ds.products.find((p) => canSplit(ds, "product") && q.includes(norm(p)));
  if (named) {
    const dim = ds.channels.includes(named) ? "channel" : "product";
    const f = { ...filters, [dim]: named };
    const { current, previous } = applyFilters(rows, f);
    const cur = sumRows(current);
    const prev = sumRows(previous);
    const factors = comparable ? segmentFactors(ctx, dim === "channel" ? { channel: named } : { product: named }) : null;
    const dom = factors ? [...factors].sort((x, y) => y.share - x.share)[0] : null;
    const momentum = dim === "product" ? productMomentum(rows, { ...filters, product: "all" }, derived).find((m) => m.product === named) : undefined;
    const pct = pctChange(cur.revenue, prev.revenue);
    return {
      text: comparable
        ? `${named} 매출은 ${josa(formatKRW(cur.revenue), "으로")} 이전 같은 기간보다 ${signed(pct)}(${signedKRW(cur.revenue - prev.revenue)}) ${pct >= 0 ? "늘었습니다" : "줄었습니다"}.${
            dom && dom.share > 0 ? ` 가장 큰 요인은 ${factorPhrase(dom)}(${signed(dom.pct)})입니다.` : ""
          }${momentum ? ` 최근 7일 판매는 그 전 3주의 주간 수준보다 ${signed(momentum.pct)}입니다.` : ""}`
        : `${named} 매출은 ${formatKRW(cur.revenue)}입니다. ${noCompare}`,
      evidence: factors ? factors.map((x) => `${x.label} ${x.text} (${signed(x.pct)})`) : [`매출 ${formatKRW(cur.revenue)}`],
      links: [{ kind: "segment", ...(dim === "channel" ? { channel: named } : { product: named }), metric: "revenue", label: `${named}만 보기` }],
      scope,
    };
  }

  // 4) 상품
  if (/(상품|제품|메뉴|잘팔|인기|베스트|많이팔)/.test(q)) {
    if (!canSplit(ds, "product")) return { text: "상품 구분이 없는 데이터라 상품별로 계산할 수 없습니다.", evidence: [], links: [], scope };
    const ranked = exploreSeries(rows, { ...filters, product: "all" }, "revenue", "product");
    const total = ranked.reduce((a, r) => a + r.value, 0) || 1;
    const rising = productMomentum(rows, { ...filters, product: "all" }, derived).find((m) => m.pct >= 15);
    const top = ranked[0];
    return {
      text: `가장 많이 팔린 상품은 '${top.name}'(매출 ${formatKRW(top.value)}, 전체의 ${((top.value / total) * 100).toFixed(0)}%)입니다.${
        rising ? ` 요즘 가장 빠르게 늘고 있는 상품은 '${rising.product}'로, 최근 7일 판매가 평소보다 ${rising.pct.toFixed(0)}% 많습니다.` : ""
      }`,
      evidence: ranked.slice(0, 4).map((r) => `${r.name} ${formatKRW(r.value)} (${((r.value / total) * 100).toFixed(0)}%)`),
      links: [{ kind: "segment", product: (rising?.product ?? top.name), metric: "revenue", label: `${rising?.product ?? top.name}만 보기` }],
      scope,
    };
  }

  // 5) 재구매
  if (/(재구매|단골|리텐션|재방문)/.test(q)) {
    if (derived.includes("returningCustomers") || derived.includes("customers"))
      return { text: "재구매 고객 컬럼이 없는 데이터라 재구매율을 계산할 수 없습니다.", evidence: [], links: [], scope };
    const { current, previous } = applyFilters(rows, filters);
    const cur = sumRows(current);
    const prev = sumRows(previous);
    const rate = (t: typeof cur) => (t.customers > 0 ? (t.returning / t.customers) * 100 : 0);
    return {
      text: comparable
        ? `재구매 고객 비중은 ${rate(cur).toFixed(1)}%로, 이전 같은 기간(${rate(prev).toFixed(1)}%)보다 ${Math.abs(rate(cur) - rate(prev)).toFixed(1)}%p ${rate(cur) >= rate(prev) ? "올랐습니다" : "내려갔습니다"}.`
        : `재구매 고객 비중은 ${rate(cur).toFixed(1)}%입니다. ${noCompare}`,
      evidence: [`구매 고객 ${formatNumber(cur.customers)}명`, `재구매 고객 ${formatNumber(cur.returning)}명`],
      links: [{ kind: "segment", metric: "customers", label: "고객 수 추이 보기" }],
      scope,
    };
  }

  // 6) 예측
  if (/(다음|예상|예측|전망|앞으로)/.test(q)) {
    // 대시보드·예측 화면과 같은 입력(선택한 채널·상품의 전체 기간)으로 예측한다.
    const fc = computeForecasts(filterDimensions(rows, filters))[0];
    if (!fc) {
      return {
        text: `예측하려면 최소 ${FORECAST_MIN_DAYS}일치 데이터가 필요합니다. 지금 데이터는 ${uniqueDates(rows).length}일치입니다.`,
        evidence: [],
        links: [],
        scope,
      };
    }
    return {
      text: `다음 7일 매출은 약 ${josa(formatKRW(fc.next7Total), "으로")} 예상됩니다. 직전 7일보다 ${Math.abs(fc.changePct).toFixed(1)}% ${fc.changePct >= 0 ? "많은" : "적은"} 수준입니다. 최근 추세를 이어 그린 단순 모델의 추정치입니다.`,
      evidence: [`다음 7일 예상 ${formatKRW(fc.next7Total)}`, `직전 7일 대비 ${signed(fc.changePct, 1)}`],
      links: [],
      scope,
    };
  }

  // 7) 무엇부터 해야 하나
  if (/(위험|주의|할일|해야|먼저|확인할|조치|대응)/.test(q)) {
    const first = b.actions[0];
    return {
      text: b.risk
        ? `지금 가장 먼저 볼 것은 '${b.risk.title}'입니다. ${b.risk.body}${first ? ` 우선 할 일: ${first.title}.` : ""}`
        : "지금 바로 확인이 필요한 위험 신호는 없습니다.",
      evidence: b.actions.map((a) => `${a.title} — ${a.evidence}`),
      links: b.risk?.link ? [b.risk.link] : [],
      scope,
    };
  }

  // 8) 왜 늘었나/줄었나 — 브리핑과 같은 결론
  if (/(왜|이유|원인|떨어|하락|감소|줄었|늘었|올랐|증가|어때|어떻)/.test(q) || q.includes("매출")) {
    const parts = [b.headline];
    if (b.change) parts.push(b.change.body);
    if (b.cause) parts.push(`가장 가능성 높은 원인은 '${b.cause.title}'입니다(추정). ${b.cause.body}`);
    else if (b.causeHint) parts.push(b.causeHint);
    return {
      text: parts.join(" "),
      evidence: [...(b.change?.evidence ?? []), ...(b.cause?.evidence ?? [])].slice(0, 6),
      links: [b.change?.link, b.cause?.link].filter((x): x is QaLink => !!x),
      scope,
    };
  }

  return {
    text: `${b.headline} 이 데이터에서는 매출 변화의 이유, 특정 날짜의 급변, 채널·상품별 흐름${
      derived.includes("adSpend") ? "" : ", 광고 효율"
    }을 물어볼 수 있습니다.`,
    evidence: [],
    links: [],
    scope,
  };
}

/** 지금 데이터에서 실제로 답이 나오는 질문만 추천한다. */
export function suggestedQuestions(ds: DemoDataset, filters: Filters): Suggestion[] {
  const ctx = insightContext(ds, filters);
  const { rows, derived = [] } = ctx;
  const b = summarize(ds, filters);
  const out: Suggestion[] = [];
  const up = b.revenue.changePct >= 0;

  if (b.comparable) out.push({ question: `매출이 왜 ${up ? "늘었어" : "줄었어"}?`, hint: "기간 비교" });
  const alert = b.anomalies.find((a) => a.direction === "down" && a.severity !== "info");
  if (alert) out.push({ question: `${formatMonthDay(alert.date)} ${alert.channel ?? "전체"}에 무슨 일이 있었어?`, hint: "감지된 급변" });
  const driver = b.change?.link?.kind === "segment" ? (b.change.link.channel ?? b.change.link.product) : undefined;
  if (driver && b.comparable) {
    const c = contributions(rows, filters, ds.channels.includes(driver) ? "channel" : "product").items.find((i) => i.name === driver);
    if (c) out.push({ question: `${driver} 매출은 왜 ${c.delta >= 0 ? "늘었어" : "줄었어"}?`, hint: "가장 큰 변화" });
  }
  const rising = productMomentum(rows, { ...filters, product: "all" }, derived).find((m) => m.pct >= 15);
  if (rising) out.push({ question: `${rising.product} 판매는 요즘 어때?`, hint: "빠르게 느는 상품" });
  else if (canSplit(ds, "product")) out.push({ question: "가장 잘 팔린 상품은?", hint: "상품 순위" });
  if (!derived.includes("adSpend") && b.comparable) {
    const weak = b.insights.find((i) => i.id === "ad-weak");
    out.push({ question: weak?.drill?.channel ? `${weak.drill.channel} 광고비는 효과가 있었어?` : "광고 효율이 가장 높은 채널은?", hint: "광고 효율" });
  }
  out.push({ question: "지금 가장 먼저 확인할 일은?", hint: "위험·할 일" });
  if (uniqueDates(rows).length >= FORECAST_MIN_DAYS) out.push({ question: "다음 7일 매출은 어떻게 될까?", hint: "추정" });
  return out.slice(0, 6);
}
