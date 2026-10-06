import { afterEach, describe, expect, it, vi } from "vitest";
import { answerDataQuestion, generateInsights, generateRecommendations } from "@/lib/insight-generator";
import { computeForecasts } from "@/lib/forecast-engine";
import { formatKRW } from "@/lib/format";
import { getDemoDatasets } from "@/lib/demo-data";
import { f, makeRows } from "./fixtures";

describe("generateInsights", () => {
  it("채널이 하나뿐이면 채널 비중 인사이트를 만들지 않는다", () => {
    const rows = makeRows({ days: 60, channels: ["전체"], mul: (_d, _c, _p, i) => (i >= 30 ? 2 : 1) });
    expect(generateInsights({ rows, filters: f("30") }).some((i) => i.id === "channel-mix")).toBe(false);
  });

  it("1%p 미만의 채널 비중 변화는 인사이트로 띄우지 않는다", () => {
    const rows = makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 1.01 : 1) });
    expect(generateInsights({ rows, filters: f("30") }).some((i) => i.id === "channel-mix")).toBe(false);
  });

  it("고객 컬럼이 추정치면 고객 행동 인사이트와 리텐션 제안을 만들지 않는다", () => {
    const rows = makeRows({ days: 60 });
    const ctx = { rows, filters: f("30"), derived: ["customers", "returningCustomers"] as const };
    expect(generateInsights({ ...ctx, derived: [...ctx.derived] }).some((i) => i.id === "customer-behavior")).toBe(false);
    expect(generateRecommendations({ ...ctx, derived: [...ctx.derived] }).some((r) => r.id === "rec-retention")).toBe(false);
  });

  it("모든 인사이트의 드릴 대상은 실제 데이터에 있는 채널·상품이다", () => {
    for (const ds of getDemoDatasets()) {
      for (const ins of generateInsights({ rows: ds.rows, filters: f("30") })) {
        if (ins.drill?.channel) expect(ds.channels).toContain(ins.drill.channel);
        if (ins.drill?.product) expect(ds.products).toContain(ins.drill.product);
      }
    }
  });
});

describe("answerDataQuestion", () => {
  it("예측 질문은 예측 화면과 같은 모델의 숫자로 답한다", () => {
    const rows = makeRows({ days: 40 });
    const expected = formatKRW(computeForecasts(rows)[0].next7Total);
    expect(answerDataQuestion("다음주 매출 예상해줘", rows)).toContain(expected);
  });

  it("없는 컬럼에 대한 질문에는 계산할 수 없다고 답한다", () => {
    const rows = makeRows({ days: 40 });
    expect(answerDataQuestion("광고 효율 제일 좋은 채널은?", rows, ["adSpend"])).toMatch(/계산할 수 없습니다/);
  });
});

describe("demo data", () => {
  afterEach(() => vi.useRealTimers());

  it("접속한 날을 마지막 날로 하는 90일이며, 같은 날에는 같은 값을 만든다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T09:00:00"));
    const a = getDemoDatasets()[0];
    const dates = Array.from(new Set(a.rows.map((r) => r.date))).sort();
    expect(dates).toHaveLength(90);
    expect(dates.at(-1)).toBe("2026-10-06");
    expect(getDemoDatasets()[0].rows[123]).toEqual(a.rows[123]);
  });
});
