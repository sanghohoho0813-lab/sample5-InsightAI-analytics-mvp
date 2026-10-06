import { describe, expect, it } from "vitest";
import { CONTEXT_MAX_BYTES, QUESTION_MAX, parseAiRequest } from "@/lib/ai/contract";
import { buildAiContext } from "@/lib/ai/context";
import { getDemoDatasets } from "@/lib/demo-data";
import { f, makeDataset, makeRows } from "./fixtures";

describe("parseAiRequest", () => {
  const context = buildAiContext(makeDataset(makeRows({ days: 40 })), f("30"));

  it("정상 요청은 질문 앞뒤 공백을 정리해 통과시킨다", () => {
    expect(parseAiRequest({ question: "  매출은?  ", context })).toEqual({ ok: true, value: { question: "매출은?", context } });
  });

  it.each([
    [null, /본문/],
    [{ question: "", context }, /질문이 비어/],
    [{ question: "x".repeat(QUESTION_MAX + 1), context }, /이하/],
    [{ question: "매출은?" }, /데이터 요약이 없/],
    [{ question: "매출은?", context: { dataset: 1 } }, /형식/],
  ])("잘못된 요청 %#은 거절한다", (body, msg) => {
    const r = parseAiRequest(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(msg);
  });

  it("너무 큰 요약은 거절한다", () => {
    const big = { ...context, anomalies: Array.from({ length: 500 }, () => ({ date: "2026-01-01", title: "x".repeat(40), detail: "y".repeat(40) })) };
    expect(parseAiRequest({ question: "q", context: big }).ok).toBe(false);
  });
});

describe("buildAiContext", () => {
  it("원본 행이 아니라 계산된 요약만 담고, 크기 제한 안에 들어간다", () => {
    for (const ds of getDemoDatasets()) {
      const ctx = buildAiContext(ds, f("30"));
      expect(JSON.stringify(ctx).length).toBeLessThan(CONTEXT_MAX_BYTES);
      expect(ctx).not.toHaveProperty("rows");
      expect(ctx.kpis.length).toBeGreaterThan(0);
    }
  });

  it("파일에 없는 항목은 unavailable로 알려주고 KPI에서 뺀다", () => {
    const ds = makeDataset(makeRows({ days: 40 }), { derived: ["visitors", "adSpend"] });
    const ctx = buildAiContext(ds, f("30"));
    expect(ctx.unavailable).toEqual(["방문자·전환율", "광고비·ROAS"]);
    expect(ctx.kpis.map((k) => k.label)).not.toContain("전환율");
  });

  it("비교할 수 없으면 증감을 null로 보낸다(모델이 지어내지 않게)", () => {
    const ctx = buildAiContext(makeDataset(makeRows({ days: 40 })), f("90"));
    expect(ctx.period.comparable).toBe(false);
    expect(ctx.kpis.every((k) => k.change === null)).toBe(true);
  });
});
