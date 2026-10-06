import { describe, expect, it } from "vitest";
import { computeForecasts, FORECAST_MIN_DAYS } from "@/lib/forecast-engine";
import { formatAxisKRW, formatKRW, formatValue } from "@/lib/format";
import { makeRows } from "./fixtures";

describe("computeForecasts", () => {
  it(`${FORECAST_MIN_DAYS}일 미만이면 예측하지 않는다`, () => {
    expect(computeForecasts(makeRows({ days: FORECAST_MIN_DAYS - 1 }))).toEqual([]);
  });

  it("매출·주문·고객 3개 지표에 대해 다음 7일을 예측한다", () => {
    const list = computeForecasts(makeRows({ days: 30 }));
    expect(list.map((x) => x.key)).toEqual(["revenue", "orders", "customers"]);
    const future = list[0].points.filter((p) => p.value == null);
    expect(future).toHaveLength(7);
  });

  it("평탄한 데이터는 같은 수준으로 예측하고, 예측값은 항상 예상 범위 안에 있다", () => {
    const [rev] = computeForecasts(makeRows({ days: 30 }));
    expect(rev.changePct).toBe(0);
    for (const p of rev.points.filter((x) => x.value == null)) {
      expect(p.lower!).toBeLessThanOrEqual(p.forecast!);
      expect(p.forecast!).toBeLessThanOrEqual(p.upper!);
    }
  });

  it("상승 추세면 다음 7일이 직전 7일보다 크다(일 성장률은 ±2.5%로 제한)", () => {
    const [rev] = computeForecasts(makeRows({ days: 30, mul: (_d, _c, _p, i) => 1 + i * 0.05 }));
    expect(rev.changePct).toBeGreaterThan(0);
    expect(rev.changePct).toBeLessThan(25);
  });
});

describe("format", () => {
  it("만·억 단위로 줄여 쓴다", () => {
    expect(formatKRW(9_999)).toBe("₩9,999");
    expect(formatKRW(1_234_567)).toBe("₩123만");
    expect(formatKRW(154_000_000)).toBe("₩1.5억");
    expect(formatValue(3.456, "percent")).toBe("3.46%");
  });

  it("축 눈금은 간격이 좁아도 같은 라벨이 반복되지 않는다", () => {
    const ticks = [100_000, 105_000, 110_000, 115_000].map(formatAxisKRW);
    expect(new Set(ticks).size).toBe(ticks.length);
    expect(ticks).toEqual(["10만", "10.5만", "11만", "11.5만"]);
    expect(formatAxisKRW(72_000_000)).toBe("7,200만");
    expect(formatAxisKRW(250_000_000)).toBe("2.5억");
  });
});
