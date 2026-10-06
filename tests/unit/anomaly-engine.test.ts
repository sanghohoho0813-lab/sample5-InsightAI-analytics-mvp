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
});
