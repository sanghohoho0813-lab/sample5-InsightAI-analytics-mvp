import { describe, expect, it } from "vitest";
import { ANOMALY_MIN_DAYS, detectAnomalies } from "@/lib/anomaly-engine";
import { END, f, isoDaysBefore, makeRows } from "./fixtures";

const day = (n: number) => isoDaysBefore(END, n);

describe("detectAnomalies", () => {
  it("변화가 없으면 아무것도 알리지 않는다", () => {
    expect(detectAnomalies(makeRows({ days: 40 }), f("30"))).toEqual([]);
  });

  it(`데이터가 ${ANOMALY_MIN_DAYS}일 미만이면 탐지하지 않는다`, () => {
    const rows = makeRows({ days: ANOMALY_MIN_DAYS - 1, mul: (d) => (d === END ? 0.3 : 1) });
    expect(detectAnomalies(rows, f("30"))).toEqual([]);
  });

  it("한 채널의 급감은 원인 채널과 함께, 같은 날 함께 움직인 지표는 한 건으로 묶는다", () => {
    const rows = makeRows({ days: 40, mul: (d, ch) => (d === day(5) && ch === "웹" ? 0.4 : 1) });
    const list = detectAnomalies(rows, f("30"));
    const drops = list.filter((a) => a.date === day(5) && a.deltaPct < 0);
    expect(drops).toHaveLength(1);
    expect(drops[0].channel).toBe("웹");
    expect(drops[0].severity).toBe("critical");
    expect(drops[0].title).toMatch(/^웹 매출 등 \d개 지표 급감$/);
    expect(drops[0].metric).toBe("매출"); // 제목의 첫 지표와 수치가 일치
  });

  it("급감 다음 날 평소로 돌아온 반등은 따로 알리지 않는다", () => {
    const rows = makeRows({ days: 40, mul: (d) => (d === day(5) ? 0.4 : 1) });
    const list = detectAnomalies(rows, f("30"));
    expect(list.some((a) => a.date === day(4))).toBe(false);
  });

  it("하루 급등 후 제자리로 돌아온 날을 '급감'으로 알리지 않는다", () => {
    const rows = makeRows({ days: 40, visitorMul: (d) => (d === day(5) ? 0.5 : 1) }); // 방문자↓ → 전환율 급등
    const list = detectAnomalies(rows, f("30"));
    expect(list.some((a) => a.date === day(4) && a.deltaPct < 0)).toBe(false);
  });

  it("상승은 좋은 소식이므로 '참고' 등급이다", () => {
    const rows = makeRows({ days: 40, mul: (d) => (d === day(3) ? 1.8 : 1) });
    const up = detectAnomalies(rows, f("30")).filter((a) => a.date === day(3) && a.deltaPct > 0);
    expect(up.length).toBeGreaterThan(0);
    expect(up.every((a) => a.severity === "info")).toBe(true);
  });

  it("기간 앞의 7일을 기준선으로 써서 '최근 7일'에서도 탐지한다", () => {
    const rows = makeRows({ days: 40, mul: (d) => (d === day(1) ? 0.4 : 1) });
    expect(detectAnomalies(rows, f("7")).some((a) => a.date === day(1))).toBe(true);
  });

  it("exclude로 뺀 지표는 검사하지 않는다(추정치로 만든 지표 보호)", () => {
    const rows = makeRows({ days: 40, visitorMul: (d) => (d === day(5) ? 0.4 : 1) });
    const withVisitors = detectAnomalies(rows, f("30"));
    const without = detectAnomalies(rows, f("30"), { exclude: ["visitors", "conversionRate"] });
    expect(withVisitors.length).toBeGreaterThan(0);
    expect(without).toEqual([]);
  });

  it("심각도 → 최신순으로 정렬한다", () => {
    const rows = makeRows({
      days: 40,
      mul: (d, ch) => (d === day(10) && ch === "웹" ? 0.3 : d === day(2) && ch === "앱" ? 0.75 : 1),
    });
    const sev = detectAnomalies(rows, f("30")).map((a) => a.severity);
    expect(sev).toEqual([...sev].sort((a, b) => ["critical", "warning", "info"].indexOf(a) - ["critical", "warning", "info"].indexOf(b)));
  });

  it("주말마다 반복되는 패턴(같은 요일 수준)은 알리지 않는다", () => {
    // 토·일 매출이 평일의 50% — 매주 반복되므로 이상치가 아니다.
    const weekend = (d: string) => [0, 6].includes(new Date(d + "T00:00:00Z").getUTCDay());
    const rows = makeRows({ days: 60, mul: (d) => (weekend(d) ? 0.5 : 1) });
    expect(detectAnomalies(rows, f("30")).filter((a) => a.direction === "down")).toEqual([]);
  });

  it("프로모션이 끝나 평소 수준으로 돌아온 날을 '급감'으로 알리지 않는다", () => {
    // 15~8일 전 한 주 동안 1.6배 → 7일 전부터 평소
    const rows = makeRows({ days: 60, mul: (_d, _c, _p, i) => (i >= 45 && i < 52 ? 1.6 : 1) });
    const list = detectAnomalies(rows, f("30"));
    expect(list.some((a) => a.direction === "down")).toBe(false);
    expect(list.some((a) => a.direction === "up")).toBe(true);
  });

  it("며칠 이어진 변화는 시작일·지속 일수를 가진 한 건으로 묶는다", () => {
    const rows = makeRows({ days: 40, mul: (_d, ch, _p, i) => (ch === "웹" && i >= 30 && i <= 32 ? 0.5 : 1) });
    const drops = detectAnomalies(rows, f("30")).filter((a) => a.direction === "down");
    expect(drops).toHaveLength(1);
    expect(drops[0]).toMatchObject({ channel: "웹", date: day(9), endDate: day(7), days: 3, ongoing: false });
  });

  it("마지막 날까지 이어지는 변화는 '진행 중'으로 표시한다", () => {
    const rows = makeRows({ days: 40, mul: (_d, _c, _p, i) => (i >= 38 ? 0.5 : 1) });
    const drop = detectAnomalies(rows, f("30")).find((a) => a.direction === "down");
    expect(drop).toMatchObject({ ongoing: true, endDate: END });
  });

  it("모든 채널이 함께 움직였으면 채널별 여러 건 대신 전체 한 건으로 알린다", () => {
    const rows = makeRows({ days: 40, mul: (d) => (d === day(4) ? 0.5 : 1) });
    const drops = detectAnomalies(rows, f("30")).filter((a) => a.direction === "down");
    expect(drops).toHaveLength(1);
    expect(drops[0].channel).toBeUndefined();
  });

  it("방문자 급감으로 전환율이 높게 계산된 날을 '전환율 급증'으로 따로 알리지 않는다", () => {
    const rows = makeRows({ days: 40, visitorMul: (d) => (d === day(5) ? 0.3 : 1) });
    const list = detectAnomalies(rows, f("30"));
    expect(list.some((a) => a.direction === "up" && a.metric === "전환율")).toBe(false);
    expect(list.some((a) => a.direction === "down" && a.metrics.some((m) => m.key === "visitors"))).toBe(true);
  });

  it("근거 수치(그날 값·평소 수준)를 지표별로 담는다", () => {
    const rows = makeRows({ days: 40, mul: (d, ch) => (d === day(5) && ch === "웹" ? 0.4 : 1) });
    const a = detectAnomalies(rows, f("30")).find((x) => x.direction === "down")!;
    const revenue = a.metrics.find((m) => m.key === "revenue")!;
    expect(revenue).toMatchObject({ date: day(5), expected: 2 * 100 * 50_000 });
    expect(revenue.deltaPct).toBeCloseTo(-60, 0);
  });
});

