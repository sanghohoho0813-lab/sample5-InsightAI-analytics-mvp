import { describe, expect, it } from "vitest";
import { breakdownRows } from "@/lib/analytics-engine";
import { anomalyTrace } from "@/lib/anomaly-engine";
import { anomaliesFor } from "@/lib/dataset-meta";
import { backtest, computeForecasts, reliability } from "@/lib/forecast-engine";
import { buildReport, compareReports, previousReport, previousScope } from "@/lib/report";
import { SavedReport } from "@/lib/types";
import { END, f, isoDaysBefore, makeDataset, makeRows } from "./fixtures";

describe("breakdownRows — 분석 화면 분해 표", () => {
  // 최근 30일에 '웹'만 50% 성장
  const rows = makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 1.5 : 1) });

  it("항목마다 이번 기간 · 이전 같은 기간 · 변화율 · 비중을 계산한다", () => {
    const list = breakdownRows(rows, f("30"), "revenue", "channel");
    const web = list.find((r) => r.name === "웹")!;
    const app = list.find((r) => r.name === "앱")!;
    expect(web.value).toBe(30 * 2 * 150 * 50_000);
    expect(web.prev).toBe(30 * 2 * 100 * 50_000);
    expect(web.change).toBe(50);
    expect(app.change).toBe(0);
    expect(web.share! + app.share!).toBeCloseTo(100, 5);
  });

  it("항목별 일별 흐름은 이번 기간 날짜 수만큼이고, 더하면 그 항목 값이다", () => {
    const web = breakdownRows(rows, f("30"), "revenue", "channel").find((r) => r.name === "웹")!;
    expect(web.trend).toHaveLength(30);
    expect(web.trend.reduce((a, b) => a + b, 0)).toBe(web.value);
  });

  it("전환율은 %p 차이로 비교하고 비중은 내지 않는다", () => {
    const conv = makeRows({ days: 60, visitorMul: (_d, ch, i) => (i >= 30 && ch === "웹" ? 0.8 : 1) });
    const web = breakdownRows(conv, f("30"), "conversionRate", "channel").find((r) => r.name === "웹")!;
    expect(web.share).toBeNull();
    expect(web.change).toBeCloseTo(5 - 4, 1); // 4% → 5%
  });

  it("비교할 이전 기간이 없으면 이전 값과 변화는 비워 둔다(지어내지 않는다)", () => {
    const list = breakdownRows(rows, f("90"), "revenue", "channel");
    expect(list.every((r) => r.prev == null && r.change == null)).toBe(true);
  });
});

describe("anomalyTrace — 이상치 목록의 작은 추이", () => {
  it("시작 7일 전부터 끝난 뒤 3일까지를 담고, 변화 구간 위치를 알려준다", () => {
    const drop = isoDaysBefore(END, 10);
    const ds = makeDataset(makeRows({ days: 40, mul: (d, ch) => (d === drop && ch === "웹" ? 0.3 : 1) }));
    const a = anomaliesFor(ds, f("30")).find((x) => x.date === drop && x.direction === "down")!;
    expect(a).toBeTruthy();
    const t = anomalyTrace(ds.rows, "all", a)!;
    expect(t.values).toHaveLength(7 + 1 + 3);
    expect(t.from).toBe(7);
    expect(t.to).toBe(7);
    expect(t.values[t.from]).toBeLessThan(t.values[0] * 0.5);
  });
});

describe("backtest — 이 예측을 얼마나 믿을 수 있나", () => {
  const dates = Array.from({ length: 30 }, (_, i) => isoDaysBefore(END, 29 - i));

  it("흐름이 일정하면 오차가 0에 가깝고 거의 모든 날이 예상 범위 안에 든다", () => {
    const flat = dates.map((_, i) => 1000 + (i % 7 === 0 ? 30 : 0));
    const b = backtest(flat, dates)!;
    expect(b.days).toHaveLength(7);
    expect(b.days[0].date).toBe(dates[23]);
    expect(b.totalErrorPct).toBeLessThan(3);
    expect(b.withinRange).toBeGreaterThanOrEqual(6); // 주 1회 튀는 날만 범위 밖
    expect(reliability(b)).toBe("high");
  });

  it("가린 7일에 급증이 있으면 크게 빗나갔다고 말한다", () => {
    const jump = dates.map((_, i) => (i >= 23 ? 1600 : 1000));
    const b = backtest(jump, dates)!;
    expect(b.totalErrorPct).toBeGreaterThan(20);
    expect(reliability(b)).toBe("low");
  });

  it("21일보다 짧으면 검증하지 않는다", () => {
    expect(backtest(dates.slice(0, 20).map(() => 1), dates.slice(0, 20))).toBeNull();
  });

  it("예측 요약에 근거(최근 하루 평균 · 하루 추세)와 검증 결과가 붙는다", () => {
    const fc = computeForecasts(makeRows({ days: 30 }))[0];
    expect(fc.basis?.recentAvg).toBe(2 * 2 * 100 * 50_000);
    expect(fc.basis?.dailyGrowthPct).toBe(0);
    expect(fc.backtest?.totalErrorPct).toBe(0);
  });
});

describe("보고서 비교 — 지난 보고서와 무엇이 달라졌나", () => {
  const ds = makeDataset(makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 1.5 : 1) }));
  const range = (from: number, to: number) => ({ start: isoDaysBefore(END, from), end: isoDaysBefore(END, to) });
  const recent = buildReport(ds, f("custom", { rangeDays: 30, range: range(29, 0) }));
  const before = { ...buildReport(ds, f("custom", { rangeDays: 30, range: range(59, 30) })), id: "rp-before" };

  it("같은 데이터·대상으로 앞서 끝나는 기간의 보고서를 고른다", () => {
    const otherChannel: SavedReport = { ...before, id: "rp-web", scope: { ...before.scope, channel: "웹" } };
    expect(previousReport(recent, [recent, before, otherChannel])?.id).toBe("rp-before");
    expect(previousReport(before, [recent, before])).toBeNull();
  });

  it("같은 지표끼리 변화율을 내고, 기간 길이가 같으면 합계로 비교한다", () => {
    const c = compareReports(before, recent);
    expect(c.perDay).toBe(false);
    const rev = c.kpis.find((k) => k.key === "revenue")!;
    expect(rev.change).toBe(25);
    expect(rev.unit).toBe("%");
    expect(c.kpis.find((k) => k.key === "conversion")?.unit).toBe("%p");
  });

  it("기간 길이가 다르면 합계 지표를 하루 평균으로 맞춘다", () => {
    const week = buildReport(ds, f("custom", { rangeDays: 7, range: range(6, 0) }));
    const c = compareReports(before, week);
    expect(c.perDay).toBe(true);
    const rev = c.kpis.find((k) => k.key === "revenue")!;
    expect(rev.label).toBe("총 매출(하루 평균)");
    expect(rev.change).toBe(25);
  });

  it("위험은 제목으로 맞춰 사라진 것과 새로 생긴 것을 나눈다", () => {
    const a = { ...recent, findings: [], anomalies: [{ title: "앱 매출 급감", description: "", severity: "warning" as const, date: END }] };
    const b = { ...recent, findings: [], anomalies: [{ title: "웹 매출 급감", description: "", severity: "critical" as const, date: END }] };
    const c = compareReports(a, b);
    expect(c.resolved).toEqual(["앱 매출 급감"]);
    expect(c.added).toEqual(["웹 매출 급감"]);
  });

  it("바로 앞 같은 길이 기간을 계산하고, 데이터가 모자라면 만들지 않는다", () => {
    expect(previousScope(recent, isoDaysBefore(END, 59))).toEqual(range(59, 30));
    expect(previousScope(before, isoDaysBefore(END, 59))).toBeNull();
  });
});
