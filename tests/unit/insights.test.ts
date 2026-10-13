import { afterEach, describe, expect, it, vi } from "vitest";
import { generateInsights, generateRecommendations } from "@/lib/insight-generator";
import { anomaliesFor } from "@/lib/dataset-meta";
import { getDemoDatasets } from "@/lib/demo-data";
import { f, makeDataset, makeRows } from "./fixtures";

/** 근거 없는 일반론 — 이런 문장은 어디에도 나오면 안 된다 */
const GENERIC = /(마케팅을 강화|매출을 늘리세요|고객 경험을 개선|최적화하세요$)/;

describe("generateInsights — 계산된 값만으로 말한다", () => {
  it("채널이 하나뿐이면 채널 기여도 인사이트를 만들지 않는다", () => {
    const rows = makeRows({ days: 60, channels: ["전체"], mul: (_d, _c, _p, i) => (i >= 30 ? 2 : 1) });
    expect(generateInsights({ rows, filters: f("30", { product: "A" }) }).some((i) => i.id === "driver")).toBe(false);
  });

  it("한 채널이 전체 하락의 대부분을 설명하면 그렇게 말한다", () => {
    const rows = makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 0.6 : i >= 30 ? 0.95 : 1) });
    const driver = generateInsights({ rows, filters: f("30") }).find((i) => i.id === "driver")!;
    expect(driver.title).toBe("웹 감소가 전체 하락의 89%를 설명합니다");
    expect(driver.impact).toBe("negative");
  });

  it("전체는 늘었는데 줄어든 채널은 '위험 신호'로 따로 짚고, 줄어든 요인까지 말한다", () => {
    const rows = makeRows({
      days: 60,
      mul: (_d, ch, _p, i) => (i >= 30 ? (ch === "웹" ? 1.5 : 0.8) : 1),
    });
    const ins = generateInsights({ rows, filters: f("30") }).find((i) => i.id === "counter-trend")!;
    expect(ins.title).toBe("전체는 늘었지만 앱 매출은 20% 줄었습니다");
    expect(ins.description).toMatch(/방문자 감소가 가장 컸습니다/);
  });

  it("광고비 증가 대비 주문 변화가 제한적이면 그 채널을 짚는다", () => {
    const rows = makeRows({ days: 60, adMul: (_d, ch, i) => (i >= 30 && ch === "앱" ? 1.5 : 1) });
    const ins = generateInsights({ rows, filters: f("30") }).find((i) => i.id === "ad-weak")!;
    expect(ins.title).toBe("앱 광고비는 50% 늘었지만 주문은 0% 증가에 그쳤습니다");
    expect(ins.evidence).toContain("광고비 1원당 매출 10.0원 → 6.7원");
  });

  it("특정 상품 판매가 최근 평소보다 크게 늘면 그 상품을 짚는다", () => {
    const rows = makeRows({ days: 40, mul: (_d, _c, p, i) => (i >= 33 && p === "B" ? 1.4 : 1) });
    const ins = generateInsights({ rows, filters: f("30") }).find((i) => i.id === "product-rising")!;
    expect(ins.title).toBe("'B' 최근 7일 판매가 평소보다 40% 많습니다");
  });

  it("고객 컬럼이 추정치면 재구매 인사이트·제안을 만들지 않는다", () => {
    const rows = makeRows({ days: 60 });
    const ctx = { rows, filters: f("30"), derived: ["customers" as const, "returningCustomers" as const] };
    expect(generateInsights(ctx).some((i) => i.id === "repeat-share")).toBe(false);
    expect(generateRecommendations(ctx).some((r) => r.id === "rec-retention")).toBe(false);
  });

  it("비교할 이전 기간이 없으면 기간 안의 흐름만 말한다", () => {
    const rows = makeRows({ days: 20, mul: (_d, _c, _p, i) => (i >= 10 ? 1.3 : 1) });
    const list = generateInsights({ rows, filters: f("30") });
    expect(list.map((i) => i.id)).toContain("half-trend");
    expect(list.some((i) => ["driver", "factor", "counter-trend"].includes(i.id))).toBe(false);
  });

  it("모든 데모 인사이트는 근거·계산 방식을 갖고, 드릴 대상은 실제 데이터에 있다", () => {
    for (const ds of getDemoDatasets()) {
      for (const ins of generateInsights({ rows: ds.rows, filters: f("30") })) {
        expect(ins.evidence.length).toBeGreaterThan(0);
        expect(ins.basis.length).toBeGreaterThan(0);
        expect(`${ins.title} ${ins.description}`).not.toMatch(GENERIC);
        if (ins.drill?.channel) expect(ds.channels).toContain(ins.drill.channel);
        if (ins.drill?.product) expect(ds.products).toContain(ins.drill.product);
      }
    }
  });
});

describe("generateRecommendations — 발견에서 나온 할 일", () => {
  it("모든 제안은 근거를 달고, 예상 효과 수치를 지어내지 않는다", () => {
    for (const ds of getDemoDatasets()) {
      const recs = generateRecommendations({ rows: ds.rows, filters: f("30") }, anomaliesFor(ds, f("30")));
      expect(recs.length).toBeGreaterThan(0);
      for (const r of recs) {
        expect(r.evidence.length).toBeGreaterThan(0);
        expect(r).not.toHaveProperty("expectedEffect");
        expect(`${r.title} ${r.description}`).not.toMatch(GENERIC);
      }
    }
  });

  it("이어지는 급감이 있으면 그 날짜·채널의 원인 확인을 가장 먼저 제안한다", () => {
    const ds = makeDataset(makeRows({ days: 60, mul: (_d, ch, _p, i) => (ch === "앱" && i >= 58 ? 0.4 : 1) }));
    const [first] = generateRecommendations({ rows: ds.rows, filters: f("30") }, anomaliesFor(ds, f("30")));
    expect(first.title).toMatch(/^6월 29일 앱 .+ 원인 확인$/);
    expect(first.priority).toBe("high");
    expect(first.link).toMatchObject({ kind: "anomaly" });
  });

  it("늘어나는 상품은 최근 7일 판매량을 근거로 재고 확보를 제안한다", () => {
    const rows = makeRows({ days: 40, mul: (_d, _c, p, i) => (i >= 33 && p === "B" ? 1.4 : 1) });
    const rec = generateRecommendations({ rows, filters: f("30") }).find((r) => r.id === "rec-stock")!;
    expect(rec.description).toMatch(/다음 7일에 약 1,960건/);
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

  it("데모 스토리의 급변이 그대로 감지된다(웹사이트 방문자 급감, 모바일 앱 전환율 하락)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T09:00:00"));
    const ds = getDemoDatasets()[0];
    const drops = anomaliesFor(ds, f("30")).filter((a) => a.direction === "down");
    expect(drops.map((a) => `${a.channel}:${a.metric}`)).toEqual(expect.arrayContaining(["웹사이트:매출", "모바일 앱:전환율"]));
    // 주말·프로모션 종료 같은 반복 패턴은 위험으로 알리지 않는다.
    expect(drops).toHaveLength(2);
  });
});
