import { filterDimensions, uniqueDates } from "./analytics-engine";
import { ANOMALY_METRICS, baselineAt, deviation, fmtMetric, MetricId, scopeSeries, subject } from "./anomaly-engine";
import { anomalyExclusions } from "./dataset-meta";
import { formatMonthDay, josa } from "./format";
import { Anomaly, DailyPoint, DemoDataset, Filters } from "./types";

/* ───────────── 진단: 지표 조합으로 본 가장 가능성 높은 원인 유형 ───────────── */

export type Pattern = "traffic" | "conversion" | "aov" | "volume" | "surge";

export interface Diagnosis {
  pattern: Pattern;
  /** 짧은 이름 — "방문자 급감" */
  short: string;
  /** 데이터 패턴으로 본 원인 유형(추정) */
  cause: string;
  /** 확인 순서 */
  steps: string[];
}

const deltaOf = (a: Anomaly, key: MetricId) => a.metrics.find((m) => m.key === key)?.deltaPct;
/** 채널 이름이 '…점'이면 오프라인 매장으로 본다 */
export const isStore = (name?: string) => !!name && /점$/.test(name);

/**
 * 이상치에 함께 움직인 지표 조합으로 원인 유형을 고른다.
 * 예) 방문자만 크게 줄고 전환율은 평소 → 유입 문제, 방문자는 평소인데 전환율만 하락 → 결제·가격 문제.
 */
export function diagnose(a: Anomaly): Diagnosis {
  const v = deltaOf(a, "visitors");
  const c = deltaOf(a, "conversionRate");
  const aov = deltaOf(a, "aov");
  const rev = deltaOf(a, "revenue");
  const store = isStore(a.channel);

  if (a.direction === "up") {
    const quality = (c ?? 0) > 0 || (aov ?? 0) > 0;
    return {
      pattern: "surge",
      short: `${a.metric} 급증`,
      cause: quality
        ? "구매 전환이나 주문 1건당 금액이 평소보다 좋아졌습니다. 상세페이지·가격·구성 변화의 효과일 가능성이 큽니다."
        : "방문과 주문이 평소보다 많았습니다. 프로모션·광고·외부 노출의 효과일 가능성이 큽니다.",
      steps: [
        "그날 진행한 프로모션·광고·노출 변화를 기록해 두세요. 다시 할 수 있는 성과인지 판단하는 근거가 됩니다.",
        "판매가 몰린 상품의 재고가 충분했는지 확인하세요.",
        a.days === 1
          ? "하루만 높았다면 같은 조건으로 한 번 더 시험해 효과를 확인하세요."
          : "효과가 언제 끝났는지(또는 계속되는지) 이어서 지켜보세요.",
      ],
    };
  }

  if (v != null && v <= -25 && (c == null || c > -15)) {
    // 주문(없으면 매출)이 방문자만큼 줄었는지로 '손님이 줄었나 / 집계가 빠졌나'를 가른다.
    // 이상치로 잡히지 않은 지표는 평소 범위 안에 있었다는 뜻이므로 0으로 본다.
    const o = deltaOf(a, "orders") ?? rev ?? 0;
    const trackingFirst = o > -10;
    const partial = !trackingFirst && Math.abs(o) < Math.abs(v) * 0.75;
    const steps = store
      ? [
          "그날 매장 운영(단축 영업·휴무·공사)에 변화가 있었는지 확인하세요.",
          "주변 행사·날씨 등 외부 요인을 기록해 두세요.",
          "출입 집계 장비가 정상이었는지 확인하세요.",
        ]
      : [
          "그날 광고가 중단되거나 일 예산이 일찍 소진되지 않았는지 광고 관리자에서 확인하세요.",
          "사이트·앱 접속 장애나 배포 기록이 있었는지 확인하세요.",
          "방문 집계(추적 코드)가 빠지지 않았는지 확인하세요.",
        ];
    if (trackingFirst && !store) steps.unshift(steps.pop()!);
    return {
      pattern: "traffic",
      short: "방문자 급감",
      cause: trackingFirst
        ? "주문은 크게 줄지 않았는데 방문자만 줄었습니다. 실제 손님이 줄었다기보다 방문 집계가 빠졌을 가능성이 큽니다."
        : partial
          ? `방문자(−${Math.abs(v).toFixed(0)}%)가 주문(−${Math.abs(o).toFixed(0)}%)보다 훨씬 크게 줄었습니다. ${
              store ? "지나가다 들르는 손님이 줄었거나 출입 집계 일부가 빠졌을" : "구매 의향이 낮은 유입(광고·외부 링크)이 끊겼거나 방문 집계 일부가 빠졌을"
            } 가능성이 큽니다.`
          : `방문자와 주문이 함께 줄었습니다. ${
              store ? "매장 운영이나 외부 요인으로 손님 자체가 줄었을" : "유입이 끊겼을(광고 중단·접속 장애)"
            } 가능성이 큽니다.`,
      steps,
    };
  }

  if (c != null && c <= -15) {
    return {
      pattern: "conversion",
      short: "전환율 하락",
      cause: "방문자는 평소와 비슷한데 구매로 이어진 비율이 떨어졌습니다. 결제 단계 오류나 가격·재고 문제일 가능성이 큽니다.",
      steps: store
        ? [
            "그날 결제 단말기·POS 오류가 있었는지 확인하세요.",
            "주력 메뉴·상품이 품절되지 않았는지 확인하세요.",
            "가격이나 프로모션 조건이 바뀌지 않았는지 확인하세요.",
          ]
        : [
            "결제·장바구니 단계의 오류 로그와 결제 실패 건수를 확인하세요.",
            "그 기간 가격·배송비·쿠폰 조건이 바뀌지 않았는지 확인하세요.",
            "주문이 많던 상품이 품절되지 않았는지 확인하세요.",
          ],
    };
  }

  if (aov != null && aov <= -15) {
    return {
      pattern: "aov",
      short: "객단가 하락",
      cause: "주문 수보다 주문 1건당 금액이 줄었습니다. 할인이 넓게 적용됐거나 저가 상품 위주로 팔렸을 가능성이 큽니다.",
      steps: [
        "할인·쿠폰이 의도보다 넓게 적용되지 않았는지 확인하세요.",
        "고가 상품의 품절이나 노출 위치 변화가 있었는지 확인하세요.",
      ],
    };
  }

  return {
    pattern: "volume",
    short: `${a.metric} 급감`,
    cause: store
      ? "방문객과 주문이 함께 줄었습니다. 매장 운영이나 외부 요인(휴일·날씨·주변 공사)의 영향일 가능성이 큽니다."
      : "방문과 구매가 함께 줄었습니다. 판매 채널의 노출이나 운영(재고·가격)에 변화가 있었을 가능성이 큽니다.",
    steps: store
      ? [
          "그날 매장 운영(단축 영업·휴무·인력)에 변화가 있었는지 확인하세요.",
          "주변 행사·날씨·공사 등 외부 요인을 기록해 두세요.",
          "주력 상품의 재고가 충분했는지 확인하세요.",
        ]
      : [
          "그날 판매 채널(스토어·앱)의 노출 위치와 운영 상태를 확인하세요.",
          "주력 상품의 재고·가격이 바뀌지 않았는지 확인하세요.",
          "같은 기간 경쟁사 프로모션 같은 외부 요인이 있었는지 기록해 두세요.",
        ],
  };
}

/* ───────────── 조사: 무엇이 → 언제부터 → 어디서 → 근거 → 할 일 ───────────── */

export interface EvidenceRow {
  /** 읽을 때 주의할 점 — 예: 방문자가 급감해 전환율이 높게 계산됨 */
  note?: string;
  key: MetricId;
  label: string;
  value: string;
  /** 평소(최근 7일 중앙값) */
  expected: string;
  /** 같은 요일 평소(최근 4주 중앙값) — 데이터가 짧으면 없음 */
  weekly: string | null;
  deltaPct: number;
  /** 이상치로 잡힌 지표인지 */
  flagged: boolean;
}

export interface BreakdownItem {
  name: string;
  value: number;
  expected: number;
  delta: number;
  deltaPct: number;
  /** 전체 변화 중 이 항목의 몫(%) — 합산 가능한 지표에서만 */
  share: number | null;
}

export interface Breakdown {
  dim: "channel" | "product";
  title: string;
  metricLabel: string;
  additive: boolean;
  items: BreakdownItem[];
  summary: string;
  format: (v: number) => string;
}

export interface Investigation {
  scope: string;
  metricKey: MetricId;
  metricLabel: string;
  peakDate: string;
  what: string;
  timeline: {
    start: string;
    end: string;
    days: number;
    ongoing: boolean;
    recoveredOn: string | null;
    text: string;
    /** 시작 전 평소 → 가장 크게 벗어난 날 → 지금(또는 회복한 날) */
    marks: { label: string; value: string; note: string; tone: "neutral" | "negative" | "positive" }[];
  };
  evidence: EvidenceRow[];
  breakdowns: Breakdown[];
  series: { date: string; value: number; expected: number | null }[];
  diagnosis: Diagnosis;
  /** 이상치를 찾은 기준 */
  method: string;
}

const pct = (v: number, base: number) => (base > 0 ? ((v - base) / base) * 100 : 0);

function itemSeries(ds: DemoDataset, product: string, scope: string, dim: "channel" | "product", name: string, end: string): DailyPoint[] {
  return scopeSeries(
    ds.rows.filter((r) => r[dim] === name),
    product,
    scope,
    end
  );
}

export function investigate(ds: DemoDataset, a: Anomaly, filters: Filters): Investigation | null {
  const key = (a.metrics[0]?.key ?? "revenue") as MetricId;
  const def = ANOMALY_METRICS.find((m) => m.key === key)!;
  const scope = a.channel ?? "전체";
  const product = filters.product;
  const series = scopeSeries(ds.rows, product, scope);
  const idx = (d: string) => series.findIndex((p) => p.date === d);
  const start = idx(a.date);
  const end = idx(a.endDate);
  const peakDate = a.metrics[0]?.date ?? a.date;
  const peak = idx(peakDate);
  if (start < 7 || end < 0 || peak < 0) return null;
  const last = series.length - 1;
  const lastDate = series[last].date;

  // 1) 무슨 변화인가
  const where = scope === "전체" ? "" : `${scope}의 `;
  const head = a.metrics[0];
  const others = a.metrics.slice(1).map((m) => `${m.label} ${m.deltaPct > 0 ? "+" : "−"}${Math.abs(m.deltaPct).toFixed(0)}%`);
  const what = `${formatMonthDay(peakDate)} ${where}${subject(head.label)} ${josa(fmtMetric(key, head.value), "으로")}, 평소(${fmtMetric(
    key,
    head.expected
  )})보다 ${Math.abs(head.deltaPct).toFixed(0)}% ${a.direction === "up" ? "많았습니다" : "적었습니다"}.${
    others.length ? ` 같은 날 ${others.join(", ")}.` : ""
  }`;

  // 2) 언제 시작했고 지금은 어떤가 — 시작 직전 평소 수준이나 같은 요일 수준과의 차이가
  //    기준의 절반 안으로 들어온 첫날을 회복일로 본다(주말처럼 원래 낮은 날을 '미회복'으로 보지 않게).
  const pre = baselineAt(series, start, key)!;
  let recoveredOn: string | null = null;
  for (let j = end + 1; j <= last; j++) {
    const weekly = baselineAt(series, j, key)?.weekly ?? null;
    if (deviation(series[j][key] as number, { level: pre.level, weekly }, def.threshold / 2) == null) {
      recoveredOn = series[j].date;
      break;
    }
  }
  const days = a.days;
  const md = formatMonthDay;
  const nextDay = recoveredOn != null && idx(recoveredOn) === end + 1;
  const text = a.ongoing
    ? `${md(a.date)}에 시작해 데이터 마지막 날(${md(lastDate)})까지 ${days}일째 이어지고 있습니다. 지금 확인이 필요합니다.`
    : recoveredOn
      ? days === 1
        ? nextDay
          ? `${md(a.date)} 하루만 나타났고, 다음 날 평소 수준으로 돌아왔습니다.`
          : `${md(a.date)} 하루 크게 벗어났고, ${md(recoveredOn)}에야 평소 수준으로 돌아왔습니다.`
        : `${md(a.date)}에 시작해 ${days}일간 이어졌고, ${md(recoveredOn)}에 평소 수준으로 돌아왔습니다.`
      : `${md(a.date)}에 시작해 ${days}일간 크게 벗어났고, 데이터 마지막 날까지 평소 수준으로 완전히 돌아오지 않았습니다.`;

  // 3) 근거 — 그날의 지표별 값과 평소 수준
  const excluded = anomalyExclusions(ds);
  const flagged = new Set(a.metrics.map((m) => m.key));
  const visitorDrop = a.metrics.some((m) => m.key === "visitors" && m.deltaPct <= -25);
  const evidence: EvidenceRow[] = ANOMALY_METRICS.filter((m) => !excluded.includes(m.key as never)).map((m) => {
    const b = baselineAt(series, peak, m.key)!;
    const v = series[peak][m.key] as number;
    const up = v > b.level;
    return {
      note:
        m.key === "conversionRate" && visitorDrop && up
          ? "방문자가 크게 줄어 높게 계산된 값입니다"
          : undefined,
      key: m.key,
      label: m.label,
      value: fmtMetric(m.key, v),
      expected: fmtMetric(m.key, b.level),
      weekly: b.weekly != null ? fmtMetric(m.key, b.weekly) : null,
      deltaPct: +pct(v, b.level).toFixed(1),
      flagged: flagged.has(m.key),
    };
  });

  // 4) 어디서 — 그날의 변화를 채널(전체일 때)·상품으로 나눈다
  const additive = key === "revenue" || key === "visitors" || key === "orders";
  const scopedRows = filterDimensions(ds.rows, { ...filters, channel: "all" }).filter((r) => r.date <= lastDate);
  const dims: ("channel" | "product")[] = [];
  if (scope === "전체" && new Set(scopedRows.map((r) => r.channel)).size > 1) dims.push("channel");
  if (product === "all" && new Set(scopedRows.filter((r) => scope === "전체" || r.channel === scope).map((r) => r.product)).size > 1)
    dims.push("product");
  const down = a.direction === "down";
  const breakdowns: Breakdown[] = dims.map((dim) => {
    const names = Array.from(new Set(scopedRows.filter((r) => scope === "전체" || r.channel === scope).map((r) => r[dim])));
    const raw = names.map((name) => {
      const s = itemSeries(ds, product, dim === "channel" ? name : scope, dim, name, lastDate);
      const i = s.findIndex((p) => p.date === peakDate);
      const b = i >= 7 ? baselineAt(s, i, key) : null;
      const value = i >= 0 ? (s[i][key] as number) : 0;
      const expected = b?.level ?? 0;
      return { name, value, expected, delta: value - expected, deltaPct: pct(value, expected) };
    });
    const totalDelta = raw.reduce((acc, x) => acc + x.delta, 0);
    const items: BreakdownItem[] = raw
      .map((x) => ({ ...x, deltaPct: +x.deltaPct.toFixed(1), share: additive && totalDelta !== 0 ? (x.delta / totalDelta) * 100 : null }))
      .sort((x, y) => (additive ? (y.share ?? 0) - (x.share ?? 0) : down ? x.deltaPct - y.deltaPct : y.deltaPct - x.deltaPct));
    const unit = dim === "channel" ? "채널" : "상품";
    const top = items[0];
    const spread = items.filter((i) => Math.sign(i.delta) === (down ? -1 : 1) && Math.abs(i.deltaPct) >= 10).length;
    let summary: string;
    if (additive && top?.share != null && top.share >= 60) {
      summary = `${down ? "감소" : "증가"}분의 ${Math.round(Math.min(top.share, 100))}%가 ${top.name}에서 나왔습니다.`;
    } else if (spread >= Math.max(2, Math.ceil(items.length * 0.6))) {
      summary = `특정 ${unit}에 몰리지 않고 대부분의 ${unit}에서 함께 ${down ? "줄었" : "늘었"}습니다. ${unit} 하나보다 ${
        scope === "전체" ? "사업 전체" : scope
      }에 영향을 준 요인일 가능성이 큽니다.`;
    } else if (top) {
      summary = `${top.name}의 변화가 가장 컸습니다(평소 대비 ${top.deltaPct > 0 ? "+" : "−"}${Math.abs(top.deltaPct).toFixed(0)}%).`;
    } else summary = "";
    return {
      dim,
      title: `${unit}별 ${def.label}`,
      metricLabel: def.label,
      additive,
      items,
      summary,
      format: (v: number) => fmtMetric(key, v),
    };
  });

  // 5) 할 일 — 원인 유형별 확인 순서, 한 상품에 몰렸으면 그 상품부터
  const diagnosis = diagnose(a);
  const productSplit = breakdowns.find((b) => b.dim === "product");
  const focus = productSplit?.additive && productSplit.items[0]?.share != null && productSplit.items[0].share >= 60 ? productSplit.items[0] : null;
  if (focus && diagnosis.pattern !== "surge") {
    diagnosis.steps = [
      `'${focus.name}'의 재고·가격·상세페이지 상태부터 확인하세요. 변화의 ${Math.round(Math.min(focus.share!, 100))}%가 이 상품에서 나왔습니다.`,
      ...diagnosis.steps,
    ].slice(0, 4);
  }
  if (a.ongoing && diagnosis.pattern !== "surge") {
    diagnosis.steps = [`아직 이어지고 있으므로 오늘 바로 확인하세요.`, ...diagnosis.steps].slice(0, 4);
  }

  // 차트 — 시작 10일 전부터 끝난 뒤 7일까지, 평소 수준(최근 7일 중앙값)과 함께
  const from = Math.max(0, start - 10);
  const to = Math.min(last, end + 7);
  const chart = series.slice(from, to + 1).map((p, k) => {
    const b = baselineAt(series, from + k, key);
    return { date: p.date, value: p[key] as number, expected: b?.level ?? null };
  });

  const hasWeekly = uniqueDates(scopedRows).length >= 15;
  const v = (i: number) => series[i][key] as number;
  const off = (val: number) => `평소 대비 ${pct(val, pre.level) >= 0 ? "+" : "−"}${Math.abs(pct(val, pre.level)).toFixed(0)}%`;
  const afterIdx = recoveredOn ? idx(recoveredOn) : last;
  const marks: Investigation["timeline"]["marks"] = [
    { label: `시작 전 7일(${md(series[start - 7].date)}~)`, value: fmtMetric(key, pre.level), note: "하루 기준 평소 수준", tone: "neutral" },
    { label: md(peakDate), value: fmtMetric(key, v(peak)), note: off(v(peak)), tone: a.direction === "down" ? "negative" : "positive" },
  ];
  if (afterIdx > end) {
    marks.push({
      label: recoveredOn ? `${md(recoveredOn)} · 회복` : `${md(series[last].date)} · 마지막 날`,
      value: fmtMetric(key, v(afterIdx)),
      note: off(v(afterIdx)),
      tone: recoveredOn ? "neutral" : a.direction === "down" ? "negative" : "positive",
    });
  }
  return {
    scope,
    metricKey: key,
    metricLabel: def.label,
    peakDate,
    what,
    timeline: { start: a.date, end: a.endDate, days, ongoing: a.ongoing, recoveredOn, text, marks },
    evidence,
    breakdowns,
    series: chart,
    diagnosis,
    method: `평소 수준 = 직전 7일 중앙값${hasWeekly ? "과 최근 4주 같은 요일 중앙값(둘 다에서 벗어나야 이상치)" : ""} · 규칙 기반 계산`,
  };
}
