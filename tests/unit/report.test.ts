import { describe, expect, it } from "vitest";
import { buildReport, comparisonLabel, keyFinding, reportSignature, summarize } from "@/lib/report";
import { availableKpis, canSplit } from "@/lib/dataset-meta";
import { computeKpis } from "@/lib/analytics-engine";
import { f, makeDataset, makeRows } from "./fixtures";

// 최근 30일에 '웹' 채널만 50% 성장 → 전체 증가분 전부가 웹에서 나온다.
const growth = makeDataset(makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 1.5 : 1) }));

describe("summarize", () => {
  it("헤드라인은 이전 같은 기간 대비 증감을 말한다", () => {
    const s = summarize(growth, f("30"));
    expect(s.comparable).toBe(true);
    expect(s.headline).toMatch(/이전 30일보다 25\.0% 늘었습니다/);
  });

  it("'왜 변했나'는 증감분을 가장 많이 만든 채널(기여도)이고, 그 채널로 드릴한다", () => {
    const s = summarize(growth, f("30"));
    expect(s.why?.title).toMatch(/^웹 매출 \+/);
    expect(s.why?.description).toMatch(/100%가 웹에서/);
    expect(s.why?.drill).toEqual({ channel: "웹", metric: "revenue" });
  });

  it("채널을 고른 상태면 상품 기준으로 기여도를 계산한다", () => {
    const ds = makeDataset(makeRows({ days: 60, mul: (_d, _c, p, i) => (i >= 30 && p === "B" ? 2 : 1) }));
    expect(summarize(ds, f("30", { channel: "웹" })).why?.drill).toEqual({ product: "B", metric: "revenue" });
  });

  it("비교할 이전 기간이 없으면 증감을 말하지 않는다", () => {
    const s = summarize(growth, f("90"));
    expect(s.comparable).toBe(false);
    expect(s.headline).not.toMatch(/늘었|줄었/);
    expect(comparisonLabel(growth, f("90"))).toMatch(/비교할 이전 기간 없음/);
  });
});

describe("buildReport", () => {
  it("저장 시점 계산을 스냅샷으로 담고, 같은 범위는 같은 signature를 갖는다", () => {
    const r = buildReport(growth, f("30"));
    expect(r.signature).toBe(reportSignature(growth, f("30")));
    expect(r.signature).not.toBe(reportSignature(growth, f("30", { channel: "웹" })));
    expect(r.kpis).toHaveLength(5);
    expect(r.title).toMatch(/보고서$/);
    expect(buildReport(growth, f("30"), "  내 제목 ").title).toBe("내 제목");
  });

  it("분석 기록용 한 줄은 실제 계산된 요인이다", () => {
    expect(keyFinding(growth, f("30")).keyInsight).toMatch(/^웹 매출/);
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
});
