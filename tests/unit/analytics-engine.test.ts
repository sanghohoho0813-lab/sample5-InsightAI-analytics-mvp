import { describe, expect, it } from "vitest";
import { channelShares, computeKpis, isComparable, resolveDates, trendSeries } from "@/lib/analytics-engine";
import { END, f, isoDaysBefore, makeRows } from "./fixtures";

const rows90 = makeRows({ days: 90 });

describe("resolveDates", () => {
  it("최근 30일은 마지막 날을 포함한 30일이고, 바로 앞 30일이 이전 기간이다", () => {
    const { currentDates, previousDates } = resolveDates(rows90, f("30"));
    expect(currentDates).toHaveLength(30);
    expect(currentDates.at(-1)).toBe(END);
    expect(previousDates).toHaveLength(30);
    expect(previousDates.at(-1)).toBe(isoDaysBefore(END, 30));
  });

  it("데이터 밖의 직접 선택 구간은 프리셋 길이로 되돌아간다", () => {
    const { currentDates } = resolveDates(rows90, f("custom", { range: { start: "2020-01-01", end: "2020-01-05" }, rangeDays: 5 }));
    expect(currentDates).toHaveLength(5);
    expect(currentDates.at(-1)).toBe(END);
  });
});

describe("이전 기간 비교", () => {
  it("같은 길이의 이전 구간이 있을 때만 비교한다", () => {
    expect(isComparable(rows90, f("30"))).toBe(true);
    expect(isComparable(rows90, f("90"))).toBe(false);
  });

  it("비교할 수 없으면 증감을 0으로 두고 comparable=false로 표시한다 (가짜 +100% 방지)", () => {
    const kpis = computeKpis(rows90, f("90"));
    expect(kpis.every((k) => k.comparable === false && k.changePct === 0)).toBe(true);
  });

  it("비교할 수 없으면 추이 차트에 이전 기간 선을 넣지 않는다", () => {
    expect(trendSeries(rows90, f("90")).some((p) => p.prevRevenue != null)).toBe(false);
    expect(trendSeries(rows90, f("30")).every((p) => p.prevRevenue != null)).toBe(true);
  });

  it("비교할 수 없으면 채널 비중 변화도 0이다", () => {
    expect(channelShares(rows90, f("90")).every((s) => s.changePct === 0)).toBe(true);
  });
});

describe("computeKpis", () => {
  it("매출이 두 배가 되면 +100%, 전환율은 %p로 계산한다", () => {
    const rows = makeRows({ days: 60, mul: (_d, _c, _p, i) => (i >= 30 ? 2 : 1) });
    const kpis = computeKpis(rows, f("30"));
    const revenue = kpis.find((k) => k.key === "revenue")!;
    expect(revenue.changePct).toBe(100);
    expect(revenue.value).toBe(30 * 4 * 200 * 50_000); // 30일 × (채널2×상품2) × 주문200 × 5만원
    const conv = kpis.find((k) => k.key === "conversion")!;
    expect(conv.changePct).toBeCloseTo(0, 5); // 방문자도 같이 늘었으므로 전환율은 그대로
  });

  it("채널 필터를 걸면 그 채널만 합산한다", () => {
    const all = computeKpis(rows90, f("30")).find((k) => k.key === "revenue")!.value;
    const web = computeKpis(rows90, f("30", { channel: "웹" })).find((k) => k.key === "revenue")!.value;
    expect(web).toBe(all / 2);
  });
});
