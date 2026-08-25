import { ChannelShare, DailyPoint, DataRow, Filters, KpiResult } from "./types";

export function uniqueDates(rows: DataRow[]): string[] {
  return Array.from(new Set(rows.map((r) => r.date))).sort();
}

export function applyFilters(rows: DataRow[], filters: Filters): {
  current: DataRow[];
  previous: DataRow[];
  currentDates: string[];
  previousDates: string[];
} {
  const dates = uniqueDates(rows);
  const n = Math.min(filters.rangeDays, dates.length);
  const currentDates = dates.slice(-n);
  const previousDates = dates.slice(-(n * 2), -n);
  const dimOk = (r: DataRow) =>
    (filters.channel === "all" || r.channel === filters.channel) &&
    (filters.product === "all" || r.product === filters.product);
  const curSet = new Set(currentDates);
  const prevSet = new Set(previousDates);
  return {
    current: rows.filter((r) => curSet.has(r.date) && dimOk(r)),
    previous: rows.filter((r) => prevSet.has(r.date) && dimOk(r)),
    currentDates,
    previousDates,
  };
}

interface Totals {
  revenue: number;
  orders: number;
  customers: number;
  visitors: number;
  adSpend: number;
}

function totals(rows: DataRow[]): Totals {
  const t: Totals = { revenue: 0, orders: 0, customers: 0, visitors: 0, adSpend: 0 };
  for (const r of rows) {
    t.revenue += r.revenue;
    t.orders += r.orders;
    t.customers += r.customers;
    t.visitors += r.visitors;
    t.adSpend += r.adSpend;
  }
  return t;
}

export function dailySeries(rows: DataRow[], dates: string[]): DailyPoint[] {
  const map = new Map<string, Totals>();
  for (const d of dates) map.set(d, { revenue: 0, orders: 0, customers: 0, visitors: 0, adSpend: 0 });
  for (const r of rows) {
    const t = map.get(r.date);
    if (!t) continue;
    t.revenue += r.revenue;
    t.orders += r.orders;
    t.customers += r.customers;
    t.visitors += r.visitors;
    t.adSpend += r.adSpend;
  }
  return dates.map((date) => {
    const t = map.get(date)!;
    return {
      date,
      revenue: t.revenue,
      orders: t.orders,
      customers: t.customers,
      visitors: t.visitors,
      adSpend: t.adSpend,
      conversionRate: t.visitors > 0 ? +((t.orders / t.visitors) * 100).toFixed(2) : 0,
      aov: t.orders > 0 ? Math.round(t.revenue / t.orders) : 0,
    };
  });
}

/** 주간/월간 집계 */
export function aggregateSeries(points: DailyPoint[], unit: "day" | "week" | "month"): DailyPoint[] {
  if (unit === "day") return points;
  const buckets = new Map<string, DailyPoint[]>();
  for (const p of points) {
    let key: string;
    if (unit === "month") {
      key = p.date.slice(0, 7);
    } else {
      const d = new Date(p.date + "T00:00:00Z");
      const day = (d.getUTCDay() + 6) % 7; // 월요일 시작
      d.setUTCDate(d.getUTCDate() - day);
      key = d.toISOString().slice(0, 10);
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(p);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, pts]) => {
      const revenue = pts.reduce((s, p) => s + p.revenue, 0);
      const orders = pts.reduce((s, p) => s + p.orders, 0);
      const visitors = pts.reduce((s, p) => s + p.visitors, 0);
      const customers = pts.reduce((s, p) => s + p.customers, 0);
      const adSpend = pts.reduce((s, p) => s + p.adSpend, 0);
      const prevRevenue = pts.some((p) => p.prevRevenue != null)
        ? pts.reduce((s, p) => s + (p.prevRevenue ?? 0), 0)
        : undefined;
      return {
        date: key,
        revenue,
        orders,
        visitors,
        customers,
        adSpend,
        conversionRate: visitors > 0 ? +((orders / visitors) * 100).toFixed(2) : 0,
        aov: orders > 0 ? Math.round(revenue / orders) : 0,
        prevRevenue,
      };
    });
}

function pctChange(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return +(((cur - prev) / prev) * 100).toFixed(1);
}

export function computeKpis(rows: DataRow[], filters: Filters): KpiResult[] {
  const { current, previous, currentDates } = applyFilters(rows, filters);
  const cur = totals(current);
  const prev = totals(previous);
  const daily = dailySeries(current, currentDates);

  const curConv = cur.visitors > 0 ? (cur.orders / cur.visitors) * 100 : 0;
  const prevConv = prev.visitors > 0 ? (prev.orders / prev.visitors) * 100 : 0;
  const curAov = cur.orders > 0 ? cur.revenue / cur.orders : 0;
  const prevAov = prev.orders > 0 ? prev.revenue / prev.orders : 0;

  return [
    {
      key: "revenue",
      label: "총 매출",
      value: cur.revenue,
      prevValue: prev.revenue,
      changePct: pctChange(cur.revenue, prev.revenue),
      format: "currency",
      spark: daily.map((d) => d.revenue),
    },
    {
      key: "orders",
      label: "주문 수",
      value: cur.orders,
      prevValue: prev.orders,
      changePct: pctChange(cur.orders, prev.orders),
      format: "number",
      spark: daily.map((d) => d.orders),
    },
    {
      key: "customers",
      label: "고객 수",
      value: cur.customers,
      prevValue: prev.customers,
      changePct: pctChange(cur.customers, prev.customers),
      format: "number",
      spark: daily.map((d) => d.customers),
    },
    {
      key: "conversion",
      label: "전환율",
      value: +curConv.toFixed(2),
      prevValue: +prevConv.toFixed(2),
      changePct: +(curConv - prevConv).toFixed(2), // %p
      format: "percent",
      spark: daily.map((d) => d.conversionRate),
    },
    {
      key: "aov",
      label: "평균 주문 금액",
      value: Math.round(curAov),
      prevValue: Math.round(prevAov),
      changePct: pctChange(curAov, prevAov),
      format: "currencyExact",
      spark: daily.map((d) => d.aov),
    },
  ];
}

/** 현재 기간 일별 시리즈 + 이전 기간 비교값 */
export function trendSeries(rows: DataRow[], filters: Filters): DailyPoint[] {
  const { current, previous, currentDates, previousDates } = applyFilters(rows, filters);
  const cur = dailySeries(current, currentDates);
  const prev = dailySeries(previous, previousDates);
  return cur.map((p, i) => ({ ...p, prevRevenue: prev[i]?.revenue }));
}

export function channelShares(rows: DataRow[], filters: Filters): ChannelShare[] {
  const { current, previous } = applyFilters(rows, { ...filters, channel: "all" });
  const sum = new Map<string, number>();
  const prevSum = new Map<string, number>();
  for (const r of current) sum.set(r.channel, (sum.get(r.channel) ?? 0) + r.revenue);
  for (const r of previous) prevSum.set(r.channel, (prevSum.get(r.channel) ?? 0) + r.revenue);
  const total = Array.from(sum.values()).reduce((a, b) => a + b, 0);
  const prevTotal = Array.from(prevSum.values()).reduce((a, b) => a + b, 0) || 1;
  return Array.from(sum.entries())
    .map(([channel, revenue]) => {
      const share = total > 0 ? +((revenue / total) * 100).toFixed(1) : 0;
      const prevShare = ((prevSum.get(channel) ?? 0) / prevTotal) * 100;
      return { channel, revenue, share, changePct: +(share - prevShare).toFixed(1) };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

/** 데이터 탐색용: 지표 × 차원 집계 */
export function exploreSeries(
  rows: DataRow[],
  filters: Filters,
  metric: "revenue" | "orders" | "customers" | "conversionRate" | "adSpend",
  dimension: "date" | "channel" | "product" | "customerType"
): { name: string; value: number }[] {
  const { current, currentDates } = applyFilters(rows, filters);
  if (dimension === "date") {
    return dailySeries(current, currentDates).map((p) => ({
      name: p.date,
      value: p[metric] as number,
    }));
  }
  if (dimension === "customerType") {
    let nw = 0;
    let ret = 0;
    for (const r of current) {
      nw += r.newCustomers;
      ret += r.returningCustomers;
    }
    if (metric === "customers" || metric === "orders") return [
      { name: "신규 고객", value: nw },
      { name: "재구매 고객", value: ret },
    ];
    // 매출 등은 고객수 비율로 배분한 근사치
    const t = totals(current);
    const total = nw + ret || 1;
    const base = metric === "conversionRate" ? 0 : (t[metric as keyof Totals] as number);
    if (metric === "conversionRate") {
      const conv = t.visitors > 0 ? (t.orders / t.visitors) * 100 : 0;
      return [
        { name: "신규 고객", value: +(conv * 0.82).toFixed(2) },
        { name: "재구매 고객", value: +(conv * 1.34).toFixed(2) },
      ];
    }
    return [
      { name: "신규 고객", value: Math.round((base * nw) / total) },
      { name: "재구매 고객", value: Math.round((base * ret) / total) },
    ];
  }
  const key = dimension === "channel" ? "channel" : "product";
  const map = new Map<string, { rev: number; ord: number; cus: number; vis: number; ad: number }>();
  for (const r of current) {
    const k = r[key];
    if (!map.has(k)) map.set(k, { rev: 0, ord: 0, cus: 0, vis: 0, ad: 0 });
    const m = map.get(k)!;
    m.rev += r.revenue;
    m.ord += r.orders;
    m.cus += r.customers;
    m.vis += r.visitors;
    m.ad += r.adSpend;
  }
  return Array.from(map.entries())
    .map(([name, m]) => ({
      name,
      value:
        metric === "revenue" ? m.rev
        : metric === "orders" ? m.ord
        : metric === "customers" ? m.cus
        : metric === "adSpend" ? m.ad
        : m.vis > 0 ? +((m.ord / m.vis) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}
