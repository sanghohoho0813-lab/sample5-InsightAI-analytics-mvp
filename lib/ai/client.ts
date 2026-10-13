import { answerQuestion, QaAnswer } from "../qa";
import { DemoDataset, Filters } from "../types";
import { AiResponse } from "./contract";
import { buildAiContext } from "./context";

export interface Answer extends QaAnswer {
  /** 누가 문장을 만들었는지 — 화면에 그대로 밝힌다(근거·링크는 항상 규칙 기반 계산) */
  source: "llm" | "rules";
}

/** 질문 하나에 걸 수 있는 최대 시간. 넘으면 규칙 기반 답으로 넘어간다. */
const REMOTE_TIMEOUT_MS = 20_000;

async function askRemote(question: string, ds: DemoDataset, filters: Filters): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REMOTE_TIMEOUT_MS);
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context: buildAiContext(ds, filters) }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AiResponse;
    return data.mode === "llm" ? data.answer : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 데이터 질의 — 서버에 LLM 키가 있으면 계산된 데이터 요약을 근거로 LLM이 답하고,
 * 없거나 실패하면 같은 계산을 쓰는 규칙 기반 엔진이 답한다.
 */
export async function askDataQuestion(question: string, ds: DemoDataset, filters: Filters): Promise<Answer> {
  // 근거와 이어 볼 화면은 화면과 같은 계산(규칙 기반)에서 만든다. LLM은 문장만 바꾼다.
  const rules = answerQuestion(question, ds, filters);
  const remote = await askRemote(question, ds, filters);
  return remote ? { ...rules, text: remote, source: "llm" } : { ...rules, source: "rules" };
}
