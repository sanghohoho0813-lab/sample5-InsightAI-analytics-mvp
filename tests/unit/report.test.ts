import { describe, expect, it } from "vitest";
import { buildReport, comparisonLabel, keyFinding, reportSignature, summarize } from "@/lib/report";
import { availableKpis, canSplit, forecastsFor } from "@/lib/dataset-meta";
import { computeKpis } from "@/lib/analytics-engine";
import { END, f, isoDaysBefore, makeDataset, makeRows } from "./fixtures";

// 최근 30일에 '웹' 채널만 50% 성장 → 전체 증가분 전부가 웹에서 나온다.
const growth = makeDataset(makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 1.5 : 1) }));

describe("summarize — 경영 브리핑", () => {
  it("한 문장 헤드라인은 이전 같은 기간 대비 증감을 말한다", () => {
    const b = summarize(growth, f("30"));
    expect(b.comparable).toBe(true);
    expect(b.headline).toBe("매출이 이전 30일보다 25.0% 늘었습니다.");
    expect(b.revenueDelta).toBe(30 * 2 * 100 * 50_000 * 0.5);
  });

  it("가장 큰 변화는 증감분을 가장 많이 만든 채널이고, 그 채널로 이어진다", () => {
    const b = summarize(growth, f("30"));
    expect(b.change?.title).toMatch(/^웹 매출 \+₩/);
    expect(b.change?.body).toMatch(/100%가 웹에서/);
    expect(b.change?.link).toMatchObject({ kind: "segment", channel: "웹" });
  });

  it("가능성 높은 원인은 그 채널의 매출을 방문자·전환율·객단가로 나눈 결과다", () => {
    const b = summarize(growth, f("30"));
    expect(b.cause?.title).toBe("웹 방문자 증가");
    expect(b.cause?.evidence?.[0]).toMatch(/^방문자 .+ \(\+50%\)$/);
    expect(b.cause?.basis).toMatch(/추정/);
  });

  it("채널을 고른 상태면 상품 기준으로 기여도를 계산한다", () => {
    const ds = makeDataset(makeRows({ days: 60, mul: (_d, _c, p, i) => (i >= 30 && p === "B" ? 2 : 1) }));
    expect(summarize(ds, f("30", { channel: "웹" })).change?.link).toMatchObject({ product: "B" });
  });

  it("지금 확인할 위험은 광고비만 늘어난 채널처럼 실제로 계산된 문제를 고른다", () => {
    const ds = makeDataset(makeRows({ days: 60, adMul: (_d, ch, i) => (i >= 30 && ch === "앱" ? 1.6 : 1) }));
    const b = summarize(ds, f("30"));
    expect(b.risk?.title).toMatch(/^앱 광고비는 60% 늘었지만/);
    expect(b.actions.some((a) => a.title === "앱 광고 증액분 성과 점검")).toBe(true);
  });

  it("아직 이어지는 급감이 있으면 그것이 가장 먼저 확인할 위험이다", () => {
    const ds = makeDataset(
      makeRows({
        days: 60,
        mul: (_d, ch, _p, i) => (ch === "앱" && i >= 57 ? 0.4 : 1),
        adMul: (_d, ch, i) => (i >= 30 && ch === "웹" ? 1.6 : 1),
      })
    );
    const b = summarize(ds, f("30"));
    expect(b.risk?.link?.kind).toBe("anomaly");
    expect(b.risk?.body).toMatch(/이어지고 있습니다/);
    expect(b.otherRisks).toBeGreaterThan(0);
  });

  it("비교할 이전 기간이 없으면 증감을 말하지 않고, 기간 안의 흐름으로 대신한다", () => {
    const b = summarize(growth, f("90"));
    expect(b.comparable).toBe(false);
    expect(b.headline).not.toMatch(/늘었|줄었/);
    expect(b.change?.title).toMatch(/^기간 후반 매출/);
    expect(b.revenueDelta).toBeNull();
    expect(comparisonLabel(growth, f("90"))).toMatch(/비교할 이전 기간 없음/);
  });

  it("주문 수가 추정치면 원인을 나누지 않고 그 이유를 말한다", () => {
    const ds = makeDataset(growth.rows, { derived: ["orders", "visitors"] });
    const b = summarize(ds, f("30"));
    expect(b.cause).toBeNull();
    expect(b.causeHint).toMatch(/주문 수 컬럼이 없어/);
  });
});

describe("buildReport — 업무 기록", () => {
  it("저장 시점의 결론(요약·범위·발견·위험·행동)을 스냅샷으로 담는다", () => {
    const r = buildReport(growth, f("30"));
    expect(r.signature).toBe(reportSignature(growth, f("30")));
    expect(r.signature).not.toBe(reportSignature(growth, f("30", { channel: "웹" })));
    expect(r.kpis).toHaveLength(5);
    expect(r.title).toMatch(/보고서$/);
    expect(r.comparison).toBe("최근 30일 · 이전 30일과 비교");
    expect(r.brief?.change?.title).toMatch(/^웹 매출/);
    expect(r.data).toMatchObject({ source: "upload", days: 60, lastDate: END, estimated: [] });
    expect(r.findings.every((x) => Array.isArray(x.evidence) && x.evidence.length > 0)).toBe(true);
    expect(r.recommendations.every((x) => !!x.evidence && x.expectedEffect === undefined)).toBe(true);
    expect(buildReport(growth, f("30"), "  내 제목 ").title).toBe("내 제목");
  });

  it("분석 기록용 한 줄은 실제 계산된 변화다", () => {
    expect(keyFinding(growth, f("30")).keyInsight).toMatch(/^웹 매출 \+/);
  });

  it("추정으로 채운 열은 '제외한 지표'로 남고, 그 지표의 예측은 담지 않는다", () => {
    const ds = makeDataset(growth.rows, { derived: ["customers", "returningCustomers", "adSpend"] });
    const r = buildReport(ds, f("30"));
    expect(r.data?.estimated).toEqual(["고객 수", "재구매 고객", "광고비"]);
    expect(r.forecasts.map((x) => x.label)).not.toContain("고객 수 예측");
  });
});

describe("dataset-meta", () => {
  it("추정으로 채운 컬럼에 기대는 KPI는 숨긴다", () => {
    const ds = makeDataset(makeRows({ days: 30 }), { derived: ["visitors", "orders"] });
    const keys = availableKpis(computeKpis(ds.rows, f("30")), ds).map((k) => k.key);
    expect(keys).toEqual(["revenue", "customers"]);
  });

  it("값이 하나뿐인 차원은 나눠 볼 수 없다", () => {
    const ds = makeDataset(makeRows({ days: 10, channels: ["전체"] }));
    expect(canSplit(ds, "channel")).toBe(false);
    expect(canSplit(ds, "product")).toBe(true);
  });

  it("예측도 실제 값이 있는 지표만 만든다", () => {
    const ds = makeDataset(makeRows({ days: 30 }), { derived: ["orders", "customers"] });
    expect(forecastsFor(ds, f("30")).map((x) => x.key)).toEqual(["revenue"]);
    expect(forecastsFor(makeDataset(makeRows({ days: 30 })), f("30"))).toHaveLength(3);
  });

  it("데모 기간 계산은 고정된 날짜로 결정적이다", () => {
    expect(isoDaysBefore(END, 1)).toBe("2026-06-29");
  });
});
