import { describe, expect, it } from "vitest";
import {
  adEfficiency,
  adsOf,
  adSpendOf,
  contributions,
  decompose,
  dominantFactor,
  halfTrend,
  productMomentum,
  signed,
  sumRows,
  weakAdSpend,
} from "@/lib/drivers";
import { applyFilters } from "@/lib/analytics-engine";
import { f, makeRows } from "./fixtures";

const totals = (rows: ReturnType<typeof makeRows>) => {
  const { current, previous } = applyFilters(rows, f("30"));
  return { cur: sumRows(current), prev: sumRows(previous) };
};

describe("decompose — 매출 = 방문자 × 전환율 × 객단가", () => {
  it("요인 몫의 합은 매출 변화와 정확히 같다(100%)", () => {
    // 최근 30일: 방문자 +20%, 객단가 +10%, 주문은 방문자만큼
    const rows = makeRows({ days: 60, mul: (_d, _c, _p, i) => (i >= 30 ? 1.2 : 1), aovMul: (_d, _c, i) => (i >= 30 ? 1.1 : 1) });
    const { cur, prev } = totals(rows);
    const factors = decompose(cur, prev)!;
    expect(factors.map((x) => x.key)).toEqual(["visitors", "conversion", "aov"]);
    expect(factors.reduce((a, x) => a + x.share, 0)).toBeCloseTo(100, 5);
    expect(dominantFactor(factors)?.key).toBe("visitors");
    expect(factors.find((x) => x.key === "conversion")!.pct).toBeCloseTo(0, 1);
  });

  it("방문자는 그대로인데 전환율이 오르면 전환율이 주된 요인이다", () => {
    const rows = makeRows({ days: 60, mul: (_d, _c, _p, i) => (i >= 30 ? 1.25 : 1), visitorMul: (_d, _c, i) => (i >= 30 ? 1 / 1.25 : 1) });
    const { cur, prev } = totals(rows);
    expect(dominantFactor(decompose(cur, prev))?.key).toBe("conversion");
  });

  it("방문자 열이 추정치면 주문 수 × 객단가로만 나눈다", () => {
    const rows = makeRows({ days: 60, mul: (_d, _c, _p, i) => (i >= 30 ? 1.2 : 1) });
    const { cur, prev } = totals(rows);
    expect(decompose(cur, prev, ["visitors"])!.map((x) => x.key)).toEqual(["orders", "aov"]);
  });

  it("주문 수가 추정치거나 변화가 1% 미만이면 나누지 않는다", () => {
    const rows = makeRows({ days: 60, mul: (_d, _c, _p, i) => (i >= 30 ? 1.2 : 1) });
    const { cur, prev } = totals(rows);
    expect(decompose(cur, prev, ["orders"])).toBeNull();
    const flat = totals(makeRows({ days: 60 }));
    expect(decompose(flat.cur, flat.prev)).toBeNull();
  });
});

describe("contributions — 증감분을 채널·상품별로", () => {
  it("몫의 합은 100%이고, 전체와 같은 방향으로 많이 움직인 순으로 정렬한다", () => {
    const rows = makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 ? (ch === "웹" ? 1.6 : 1.2) : 1) });
    const c = contributions(rows, f("30"), "channel");
    expect(c.items[0].name).toBe("웹");
    expect(c.items.reduce((a, x) => a + x.share, 0)).toBeCloseTo(100, 5);
    expect(c.items[0].share).toBeCloseTo(75, 0); // 웹 +60% vs 앱 +20%
  });

  it("전체가 줄면 가장 많이 줄어든 항목이 먼저 온다", () => {
    const rows = makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "앱" ? 0.5 : 1) });
    expect(contributions(rows, f("30"), "channel").items[0]).toMatchObject({ name: "앱", share: 100 });
  });
});

describe("productMomentum — 최근 7일 vs 그 전 3주(주 단위 중앙값)", () => {
  it("최근 7일에 늘어난 상품을 찾는다", () => {
    const rows = makeRows({ days: 40, mul: (_d, _c, p, i) => (i >= 33 && p === "B" ? 1.5 : 1) });
    const m = productMomentum(rows, f("30"));
    expect(m[0]).toMatchObject({ product: "B", unit: "orders" });
    expect(m[0].pct).toBeCloseTo(50, 0);
  });

  it("지난 3주 중 한 주만 프로모션이었으면 그 주에 끌려가지 않는다", () => {
    // 2주 전 한 주만 2배 → 중앙값은 평소 주라 최근 7일은 '평소'
    const rows = makeRows({ days: 40, mul: (_d, _c, _p, i) => (i >= 19 && i < 26 ? 2 : 1) });
    expect(productMomentum(rows, f("30")).every((m) => Math.abs(m.pct) < 1)).toBe(true);
  });

  it("4주가 안 되는 데이터나 상품이 하나뿐이면 계산하지 않는다", () => {
    expect(productMomentum(makeRows({ days: 20 }), f("7"))).toEqual([]);
    expect(productMomentum(makeRows({ days: 40, products: ["A"] }), f("30"))).toEqual([]);
  });
});

describe("adEfficiency — 광고비 증감 vs 주문 증감", () => {
  it("광고비만 크게 늘고 주문은 그대로인 채널을 찾는다", () => {
    const rows = makeRows({ days: 60, adMul: (_d, ch, i) => (i >= 30 && ch === "앱" ? 1.5 : 1) });
    const weak = weakAdSpend(adEfficiency(rows, f("30")));
    expect(weak).toMatchObject({ channel: "앱" });
    expect(weak!.adPct).toBeCloseTo(50, 0);
    expect(weak!.ordersPct).toBeCloseTo(0, 0);
  });

  it("광고비 열이 추정치거나 비교할 기간이 없으면 계산하지 않는다", () => {
    const rows = makeRows({ days: 60 });
    expect(adEfficiency(rows, f("30"), ["adSpend"])).toEqual([]);
    expect(adEfficiency(rows, f("90"))).toEqual([]);
  });
});

describe("halfTrend · signed", () => {
  it("기간을 반으로 나눠 비교한다", () => {
    const rows = makeRows({ days: 20, mul: (_d, _c, _p, i) => (i >= 10 ? 1.5 : 1) });
    expect(halfTrend(rows, f("30"))?.pct).toBeCloseTo(50, 5);
  });

  it("채널 이름이 '…광고'면 '광고'를 겹쳐 쓰지 않는다", () => {
    expect(adSpendOf("SNS 광고")).toBe("SNS 광고비");
    expect(adSpendOf("스마트스토어")).toBe("스마트스토어 광고비");
    expect(adsOf("검색 광고")).toBe("검색 광고");
    expect(adsOf("웹")).toBe("웹 광고");
  });

  it("0은 부호 없이 쓴다", () => {
    expect(signed(0.2)).toBe("0%");
    expect(signed(-3.4)).toBe("−3%");
    expect(signed(12.345, 1)).toBe("+12.3%");
  });
});
