import { applyFilters, isComparable, resolveDates, uniqueDates } from "./analytics-engine";
import { formatKRW, formatKRWExact, formatNumber } from "./format";
import { DataRow, DerivedField, Filters } from "./types";

/**
 * '왜'를 계산하는 기본 도구 모음 — 모두 원본 행에서 바로 계산되는 값만 쓴다.
 * 인사이트·경영 브리핑·이상치 조사·데이터 질의가 같은 함수를 써서 숫자가 어긋나지 않게 한다.
 */

export interface Totals {
  revenue: number;
  orders: number;
  visitors: number;
  customers: number;
  returning: number;
  adSpend: number;
}

export function sumRows(rows: DataRow[]): Totals {
  const t: Totals = { revenue: 0, orders: 0, visitors: 0, customers: 0, returning: 0, adSpend: 0 };
  for (const r of rows) {
    t.revenue += r.revenue;
    t.orders += r.orders;
    t.visitors += r.visitors;
    t.customers += r.customers;
    t.returning += r.returningCustomers;
    t.adSpend += r.adSpend;
  }
  return t;
}

export const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : 0);
export const signed = (v: number, digits = 0) => {
  const abs = Math.abs(v).toFixed(digits);
  return Number(abs) === 0 ? `${abs}%` : `${v >= 0 ? "+" : "−"}${abs}%`;
};
export const signedKRW = (v: number) => `${v >= 0 ? "+" : "−"}${formatKRW(Math.abs(v))}`;

/* ───────────── 1. 요인 분해: 매출 = 방문자 × 전환율 × 객단가 ───────────── */

export type FactorKey = "visitors" | "conversion" | "aov" | "orders";

export interface FactorChange {
  key: FactorKey;
  label: string;
  prev: number;
  cur: number;
  pct: number;
  /** 매출 변화(로그 기준) 중 이 요인이 설명하는 몫(%) — 같은 방향이면 양수 */
  share: number;
  /** 화면 표시용 "120만 → 142만" */
  text: string;
}

const FACTOR_LABEL: Record<FactorKey, string> = {
  visitors: "방문자",
  conversion: "전환율",
  aov: "객단가",
  orders: "주문 수",
};

function factorText(key: FactorKey, v: number): string {
  if (key === "conversion") return `${v.toFixed(2)}%`;
  if (key === "aov") return formatKRWExact(v);
  return key === "visitors" ? `${formatNumber(v)}명` : `${formatNumber(v)}건`;
}

/**
 * 매출 변화를 요인별로 나눈다(로그 분해 — 요인 몫의 합이 매출 변화와 정확히 맞는다).
 * 방문자 컬럼이 실제 값이면 방문자·전환율·객단가로, 주문만 있으면 주문 수·객단가로 나눈다.
 * 주문 수가 추정치거나 변화가 1% 미만이면 나누지 않는다.
 */
export function decompose(cur: Totals, prev: Totals, derived: DerivedField[] = []): FactorChange[] | null {
  if (derived.includes("orders")) return null;
  if (cur.revenue <= 0 || prev.revenue <= 0 || cur.orders <= 0 || prev.orders <= 0) return null;
  const lnR = Math.log(cur.revenue / prev.revenue);
  if (Math.abs(lnR) < 0.01) return null;
  const useVisitors = !derived.includes("visitors") && cur.visitors > 0 && prev.visitors > 0;
  const pairs: [FactorKey, number, number][] = useVisitors
    ? [
        ["visitors", prev.visitors, cur.visitors],
        ["conversion", (prev.orders / prev.visitors) * 100, (cur.orders / cur.visitors) * 100],
        ["aov", prev.revenue / prev.orders, cur.revenue / cur.orders],
      ]
    : [
        ["orders", prev.orders, cur.orders],
        ["aov", prev.revenue / prev.orders, cur.revenue / cur.orders],
      ];
  return pairs.map(([key, p, c]) => ({
    key,
    label: FACTOR_LABEL[key],
    prev: p,
    cur: c,
    pct: pctChange(c, p),
    share: (Math.log(c / p) / lnR) * 100,
    text: `${factorText(key, p)} → ${factorText(key, c)}`,
  }));
}

/** 매출 변화와 같은 방향으로 가장 크게 기여한 요인 */
export function dominantFactor(factors: FactorChange[] | null): FactorChange | null {
  if (!factors?.length) return null;
  const top = [...factors].sort((a, b) => b.share - a.share)[0];
  return top.share > 0 ? top : null;
}

/** "방문자 +18%, 전환율 +2%, 객단가 +3%" */
export const factorLine = (factors: FactorChange[]) => factors.map((f) => `${f.label} ${signed(f.pct)}`).join(", ");

/* ───────────── 2. 기여도: 증감분을 채널·상품별로 나눈다 ───────────── */

export interface Contribution {
  name: string;
  prev: number;
  cur: number;
  delta: number;
  pct: number;
  /** 전체 증감분 중 이 항목의 몫(%) — 전체와 같은 방향이면 양수 */
  share: number;
}

export interface ContributionResult {
  dim: "channel" | "product";
  prev: number;
  cur: number;
  delta: number;
  /** 전체 변화와 같은 방향으로 많이 움직인 순 */
  items: Contribution[];
}

export function contributions(rows: DataRow[], filters: Filters, dim: "channel" | "product"): ContributionResult {
  const { current, previous } = applyFilters(rows, filters);
  const map = new Map<string, { prev: number; cur: number }>();
  for (const r of current) map.set(r[dim], { prev: map.get(r[dim])?.prev ?? 0, cur: (map.get(r[dim])?.cur ?? 0) + r.revenue });
  for (const r of previous) map.set(r[dim], { prev: (map.get(r[dim])?.prev ?? 0) + r.revenue, cur: map.get(r[dim])?.cur ?? 0 });
  const prev = Array.from(map.values()).reduce((a, v) => a + v.prev, 0);
  const cur = Array.from(map.values()).reduce((a, v) => a + v.cur, 0);
  const delta = cur - prev;
  const sign = delta >= 0 ? 1 : -1;
  const items = Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      prev: v.prev,
      cur: v.cur,
      delta: v.cur - v.prev,
      pct: pctChange(v.cur, v.prev),
      share: delta !== 0 ? ((v.cur - v.prev) / delta) * 100 : 0,
    }))
    .sort((a, b) => b.delta * sign - a.delta * sign);
  return { dim, prev, cur, delta, items };
}

/** 증감을 나눠 볼 차원 — 채널을 골랐으면 상품으로, 둘 다 하나뿐이면 없음 */
export function driverDim(
  filters: Filters,
  canSplit: (dim: "channel" | "product") => boolean
): "channel" | "product" | null {
  if (filters.channel === "all" && canSplit("channel")) return "channel";
  if (filters.product === "all" && canSplit("product")) return "product";
  return null;
}

/* ───────────── 3. 상품 흐름: 최근 7일 vs 그 전 3주 ───────────── */

export interface Momentum {
  product: string;
  /** 최근 7일 합계 */
  recent: number;
  /** 그 전 3주 중 가운데 주(중앙값) — 프로모션 한 주에 흔들리지 않는다 */
  base: number;
  pct: number;
  /** 매출 기준인지 주문 수 기준인지 */
  unit: "revenue" | "orders";
  recentOrders: number;
}

/**
 * 상품별 최근 7일과 그 전 3주(주 단위 중앙값)를 비교한다.
 * 7일 단위라 요일 패턴이 상쇄되고, 중앙값이라 지난 프로모션 한 주에 끌려가지 않는다.
 */
export function productMomentum(rows: DataRow[], filters: Filters, derived: DerivedField[] = []): Momentum[] {
  const { currentDates } = resolveDates(rows, filters);
  const end = currentDates[currentDates.length - 1];
  if (!end) return [];
  const dates = uniqueDates(rows).filter((d) => d <= end);
  if (dates.length < 28) return [];
  const unit: Momentum["unit"] = derived.includes("orders") ? "revenue" : "orders";
  const weeks = [0, 1, 2, 3].map((w) => new Set(dates.slice(dates.length - 7 * (w + 1), dates.length - 7 * w)));
  const scoped = rows.filter(
    (r) => (filters.channel === "all" || r.channel === filters.channel) && (filters.product === "all" || r.product === filters.product)
  );
  const products = Array.from(new Set(scoped.map((r) => r.product)));
  if (products.length < 2) return [];
  const total = scoped.filter((r) => weeks[0].has(r.date)).reduce((a, r) => a + r.revenue, 0);
  return products
    .map((product) => {
      const pr = scoped.filter((r) => r.product === product);
      const sum = (w: number, key: "revenue" | "orders") => pr.filter((r) => weeks[w].has(r.date)).reduce((a, r) => a + r[key], 0);
      const prior = [1, 2, 3].map((w) => sum(w, unit)).sort((a, b) => a - b)[1];
      const recent = sum(0, unit);
      // 최근 매출 비중이 5% 미만인 작은 상품은 잡음이 커서 뺀다.
      const share = total > 0 ? sum(0, "revenue") / total : 0;
      return share >= 0.05 ? { product, recent, base: prior, pct: pctChange(recent, prior), unit, recentOrders: sum(0, "orders") } : null;
    })
    .filter((m): m is Momentum => m != null && m.base > 0)
    .sort((a, b) => b.pct - a.pct);
}

/* ───────────── 4. 광고 효율: 광고비 증감 vs 주문 증감 ───────────── */

export interface AdEfficiency {
  channel: string;
  adPrev: number;
  adCur: number;
  adPct: number;
  ordersPct: number;
  revenuePct: number;
  /** 광고비 1원당 매출 */
  roasPrev: number;
  roasCur: number;
}

export function adEfficiency(rows: DataRow[], filters: Filters, derived: DerivedField[] = []): AdEfficiency[] {
  if (derived.includes("adSpend") || derived.includes("orders") || !isComparable(rows, filters)) return [];
  const { current, previous } = applyFilters(rows, { ...filters, channel: "all" });
  const channels = Array.from(new Set(current.map((r) => r.channel))).filter((c) => filters.channel === "all" || c === filters.channel);
  return channels
    .map((channel) => {
      const c = sumRows(current.filter((r) => r.channel === channel));
      const p = sumRows(previous.filter((r) => r.channel === channel));
      return {
        channel,
        adPrev: p.adSpend,
        adCur: c.adSpend,
        adPct: pctChange(c.adSpend, p.adSpend),
        ordersPct: pctChange(c.orders, p.orders),
        revenuePct: pctChange(c.revenue, p.revenue),
        roasPrev: p.adSpend > 0 ? p.revenue / p.adSpend : 0,
        roasCur: c.adSpend > 0 ? c.revenue / c.adSpend : 0,
      };
    })
    .filter((a) => a.adPrev > 0 && a.adCur > 0);
}

/** 광고비가 늘어난 만큼 주문이 늘지 않은 채널 — 광고비 +15% 이상, 주문 증가율과 15%p 이상 차이 */
export function weakAdSpend(list: AdEfficiency[]): AdEfficiency | null {
  return (
    list
      .filter((a) => a.adPct >= 15 && a.adPct - a.ordersPct >= 15)
      .sort((a, b) => b.adCur - b.adPrev - (a.adCur - a.adPrev))[0] ?? null
  );
}

/* ───────────── 5. 기간 안의 흐름(비교할 이전 기간이 없을 때) ───────────── */

export function halfTrend(rows: DataRow[], filters: Filters): { days: number; first: number; second: number; pct: number } | null {
  const { current, currentDates } = applyFilters(rows, filters);
  if (currentDates.length < 4) return null;
  const half = Math.floor(currentDates.length / 2);
  const firstSet = new Set(currentDates.slice(0, half));
  const secondSet = new Set(currentDates.slice(-half));
  const first = current.filter((r) => firstSet.has(r.date)).reduce((a, r) => a + r.revenue, 0);
  const second = current.filter((r) => secondSet.has(r.date)).reduce((a, r) => a + r.revenue, 0);
  return first > 0 ? { days: half, first, second, pct: pctChange(second, first) } : null;
}
