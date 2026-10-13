import { describe, expect, it } from "vitest";
import { answerQuestion, suggestedQuestions } from "@/lib/qa";
import { summarize } from "@/lib/briefing";
import { forecastsFor } from "@/lib/dataset-meta";
import { formatKRW } from "@/lib/format";
import { END, f, isoDaysBefore, makeDataset, makeRows } from "./fixtures";

const day = (n: number) => isoDaysBefore(END, n);
const growth = makeDataset(makeRows({ days: 60, mul: (_d, ch, _p, i) => (i >= 30 && ch === "웹" ? 1.5 : 1) }));

describe("answerQuestion — 화면과 같은 계산으로, 근거·이어 볼 화면과 함께", () => {
  it("'왜 늘었어'는 대시보드 브리핑과 같은 결론으로 답한다", () => {
    const a = answerQuestion("매출이 왜 늘었어?", growth, f("30"));
    const b = summarize(growth, f("30"));
    expect(a.text.startsWith(b.headline)).toBe(true);
    expect(a.text).toMatch(/웹 방문자 증가/);
    expect(a.evidence.length).toBeGreaterThan(0);
    expect(a.links[0]).toMatchObject({ kind: "segment", channel: "웹" });
    expect(a.scope).toBe("최근 30일 · 전체 채널");
  });

  it("예측 질문은 예측 화면과 같은 모델의 숫자로 답한다", () => {
    const expected = formatKRW(forecastsFor(growth, f("30"))[0].next7Total);
    expect(answerQuestion("다음주 매출 예상해줘", growth, f("30")).text).toContain(expected);
  });

  it("없는 컬럼에 대한 질문에는 계산할 수 없다고 답한다", () => {
    const ds = makeDataset(growth.rows, { derived: ["adSpend"] });
    expect(answerQuestion("광고 효율 제일 좋은 채널은?", ds, f("30")).text).toMatch(/계산할 수 없습니다/);
  });

  it("특정 날짜를 물으면 그날의 변화를 조사 화면과 같은 내용으로 답한다", () => {
    const ds = makeDataset(makeRows({ days: 40, mul: (d, ch) => (d === day(5) && ch === "앱" ? 0.4 : 1) }));
    const [m, dd] = day(5).slice(5).split("-").map(Number);
    const a = answerQuestion(`${m}월 ${dd}일에 무슨 일이 있었어?`, ds, f("30"));
    expect(a.text).toMatch(/앱의 매출이/);
    expect(a.links[0]).toMatchObject({ kind: "anomaly" });
  });

  it("이름을 댄 채널·상품은 그 항목의 증감과 요인으로 답한다", () => {
    const a = answerQuestion("웹 매출은 어때?", growth, f("30"));
    expect(a.text).toMatch(/^웹 매출은 .+ 이전 같은 기간보다 \+50%/);
    expect(a.text).toMatch(/가장 큰 요인은 방문자 증가/);
  });

  it("광고비 질문에 채널 이름이 있으면 그 채널의 광고비·주문 변화로 답한다", () => {
    const ds = makeDataset(makeRows({ days: 60, adMul: (_d, ch, i) => (i >= 30 && ch === "앱" ? 1.5 : 1) }));
    const a = answerQuestion("앱 광고비는 효과가 있었어?", ds, f("30"));
    expect(a.text).toMatch(/광고비가 늘어난 만큼 주문이 늘지 않았습니다/);
  });
});

describe("suggestedQuestions — 지금 데이터에서 답이 나오는 질문만", () => {
  it("데이터에 맞춘 질문을 만든다(가장 큰 변화의 채널 이름이 들어간다)", () => {
    const qs = suggestedQuestions(growth, f("30")).map((s) => s.question);
    expect(qs).toContain("매출이 왜 늘었어?");
    expect(qs).toContain("웹 매출은 왜 늘었어?");
  });

  it("광고비 열이 없거나 기간이 짧으면 광고·예측 질문은 추천하지 않는다", () => {
    const short = makeDataset(makeRows({ days: 10 }), { derived: ["adSpend"] });
    const qs = suggestedQuestions(short, f("30")).map((s) => s.question).join(" ");
    expect(qs).not.toMatch(/광고/);
    expect(qs).not.toMatch(/다음 7일/);
  });

  it("추천 질문에는 모두 '계산할 수 없다'가 아닌 답이 나온다", () => {
    for (const s of suggestedQuestions(growth, f("30"))) {
      expect(answerQuestion(s.question, growth, f("30")).text).not.toMatch(/계산할 수 없습니다/);
    }
  });
});
