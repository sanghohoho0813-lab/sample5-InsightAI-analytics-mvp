import { DataRow, DemoDataset, Filters } from "@/lib/types";

export const END = "2026-06-30";

export function isoDaysBefore(end: string, n: number): string {
  const d = new Date(end + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export interface Shape {
  days: number;
  channels?: string[];
  products?: string[];
  /** 날짜·채널별 매출 배수 (기본 1) */
  mul?: (date: string, channel: string, product: string, dayIndex: number) => number;
  /** 날짜·채널별 방문자 배수 (전환율 변화 시나리오용) */
  visitorMul?: (date: string, channel: string, dayIndex: number) => number;
}

/** 잡음 없는 결정적 데이터 — 테스트가 의도한 변화만 들어간다. */
export function makeRows({ days, channels = ["웹", "앱"], products = ["A", "B"], mul, visitorMul }: Shape): DataRow[] {
  const rows: DataRow[] = [];
  for (let i = 0; i < days; i++) {
    const date = isoDaysBefore(END, days - 1 - i);
    for (const channel of channels) {
      for (const product of products) {
        const m = mul?.(date, channel, product, i) ?? 1;
        const vm = visitorMul?.(date, channel, i) ?? 1;
        const orders = Math.round(100 * m);
        const revenue = orders * 50_000;
        const visitors = Math.round(2500 * m * vm);
        const customers = Math.round(orders * 0.9);
        const returning = Math.round(customers * 0.4);
        rows.push({
          date,
          channel,
          product,
          revenue,
          orders,
          visitors,
          customers,
          newCustomers: customers - returning,
          returningCustomers: returning,
          conversionRate: +((orders / visitors) * 100).toFixed(2),
          aov: 50_000,
          adSpend: revenue * 0.1,
        });
      }
    }
  }
  return rows;
}

export function makeDataset(rows: DataRow[], extra: Partial<DemoDataset> = {}): DemoDataset {
  return {
    id: "test",
    name: "테스트 데이터",
    description: "",
    category: "테스트",
    rows,
    channels: Array.from(new Set(rows.map((r) => r.channel))),
    products: Array.from(new Set(rows.map((r) => r.product))),
    periodLabel: "",
    ...extra,
  };
}

export const f = (preset: Filters["preset"] = "30", extra: Partial<Filters> = {}): Filters => ({
  preset,
  rangeDays: preset === "custom" ? 1 : Number(preset),
  channel: "all",
  product: "all",
  ...extra,
});
