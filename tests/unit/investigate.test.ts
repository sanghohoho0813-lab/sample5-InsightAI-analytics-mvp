import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/lib/anomaly-engine";
import { diagnose, investigate } from "@/lib/investigate";
import { Anomaly } from "@/lib/types";
import { END, f, isoDaysBefore, makeDataset, makeRows } from "./fixtures";

const day = (n: number) => isoDaysBefore(END, n);

/** 테스트용 이상치 — 지표 조합만 바꿔 진단 규칙을 확인한다 */
function fake(metrics: Record<string, number>, extra: Partial<Anomaly> = {}): Anomaly {
  return {
    id: "x",
    severity: "critical",
    title: "t",
    description: "d",
    metric: "매출",
    date: day(5),
    endDate: day(5),
    days: 1,
    ongoing: false,
    direction: "down",
    deltaPct: -40,
    detail: "",
    metricKey: "revenue",
    metrics: Object.entries(metrics).map(([key, deltaPct]) => ({ key, label: key, date: day(5), value: 0, expected: 0, deltaPct })),
    ...extra,
  };
}

describe("diagnose — 함께 움직인 지표 조합으로 원인 유형을 고른다", () => {
  it("방문자만 크게 줄고 주문은 덜 줄었으면 유입 문제(또는 집계 누락)로 본다", () => {
    const d = diagnose(fake({ revenue: -40, visitors: -70, orders: -40 }));
    expect(d.pattern).toBe("traffic");
    expect(d.cause).toMatch(/방문자\(-70%\)가 주문\(-40%\)보다/);
    expect(d.steps[0]).toMatch(/광고/);
  });

  it("주문은 그대로인데 방문자만 줄었으면 집계 확인을 맨 먼저 권한다", () => {
    const d = diagnose(fake({ visitors: -50 }));
    expect(d.cause).toMatch(/집계/);
    expect(d.steps[0]).toMatch(/추적 코드/);
  });

  it("방문자는 평소인데 전환율이 떨어졌으면 결제·가격 문제로 본다", () => {
    const d = diagnose(fake({ conversionRate: -30 }));
    expect(d.pattern).toBe("conversion");
    expect(d.steps.join(" ")).toMatch(/결제/);
  });

  it("객단가만 떨어졌으면 할인·상품 구성 문제로 본다", () => {
    expect(diagnose(fake({ aov: -20 })).pattern).toBe("aov");
  });

  it("매장(…점)이면 온라인 대신 매장 운영 기준으로 확인할 일을 제시한다", () => {
    const d = diagnose(fake({ revenue: -45, visitors: -50, orders: -45 }, { channel: "홍대점" }));
    expect(d.steps.join(" ")).toMatch(/매장 운영/);
    expect(d.steps.join(" ")).not.toMatch(/광고 관리자/);
  });

  it("상승은 반복할 수 있는 성과인지 기록하도록 안내한다", () => {
    const d = diagnose(fake({ revenue: 50 }, { direction: "up", severity: "info" }));
    expect(d.pattern).toBe("surge");
    expect(d.steps[0]).toMatch(/기록/);
  });
});

describe("investigate — 무슨 변화 → 언제 → 어디서 → 근거 → 할 일", () => {
  // 5일 전 '웹' 채널의 상품 A만 크게 줄었다(하루짜리).
  const rows = makeRows({ days: 40, mul: (d, ch, p) => (d === day(5) && ch === "웹" && p === "A" ? 0.1 : 1) });
  const ds = makeDataset(rows);
  const a = detectAnomalies(rows, f("30")).find((x) => x.direction === "down")!;
  const inv = investigate(ds, a, f("30"))!;

  it("무슨 변화인지 그날 값과 평소 수준으로 말한다", () => {
    expect(a.channel).toBe("웹");
    expect(inv.what).toMatch(/웹의 매출이/);
    expect(inv.what).toMatch(/평소\(₩1,000만\)보다 45% 적었습니다/);
  });

  it("하루만 나타나고 다음 날 회복했는지 알려준다", () => {
    expect(inv.timeline.recoveredOn).toBe(day(4));
    expect(inv.timeline.text).toMatch(/하루만 나타났고, 다음 날 평소 수준/);
    expect(inv.timeline.marks).toHaveLength(3);
  });

  it("상품별로 나눠 변화가 어디에 몰렸는지 몫(%)으로 보여준다", () => {
    const byProduct = inv.breakdowns.find((b) => b.dim === "product")!;
    expect(byProduct.items[0]).toMatchObject({ name: "A" });
    expect(byProduct.items[0].share).toBeCloseTo(100, 0);
    expect(byProduct.summary).toMatch(/감소분의 100%가 A에서/);
  });

  it("한 상품에 몰렸으면 그 상품부터 확인하라고 한다", () => {
    expect(inv.diagnosis.steps[0]).toMatch(/'A'의 재고·가격·상세페이지/);
  });

  it("근거 표에는 이상치로 잡힌 지표가 표시되고, 차트는 변화 구간 앞뒤를 담는다", () => {
    expect(inv.evidence.find((e) => e.key === "revenue")?.flagged).toBe(true);
    expect(inv.series[0].date < a.date).toBe(true);
    expect(inv.series.at(-1)!.date > a.endDate).toBe(true);
  });

  it("전체 합계에서 잡힌 변화는 채널별로도 나눈다", () => {
    const all = makeRows({ days: 40, mul: (d) => (d === day(5) ? 0.5 : 1) });
    const total = detectAnomalies(all, f("30")).find((x) => x.direction === "down")!;
    const res = investigate(makeDataset(all), total, f("30"))!;
    expect(res.breakdowns.map((b) => b.dim)).toEqual(["channel", "product"]);
    expect(res.breakdowns[0].summary).toMatch(/함께 줄었습니다/);
  });
});
