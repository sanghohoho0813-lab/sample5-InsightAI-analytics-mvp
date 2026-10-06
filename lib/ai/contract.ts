/**
 * 브라우저 ↔ /api/ai 사이의 요청·응답 계약.
 * 서버와 클라이언트가 같은 검증 함수를 써서, 한쪽만 바뀌어 깨지는 일이 없게 한다.
 */

export const QUESTION_MAX = 300;
/** 모델에 넘기는 데이터 요약의 최대 크기(직렬화 기준) — 원본 행은 보내지 않는다. */
export const CONTEXT_MAX_BYTES = 12_000;

/** 질문에 답하는 데 필요한 '계산된 숫자'만 담는다. */
export interface AiContext {
  dataset: string;
  period: { start: string; end: string; days: number; comparable: boolean };
  kpis: { label: string; value: string; change: string | null }[];
  channels: { name: string; revenue: string; share: string; change: string | null }[];
  products: { name: string; revenue: string; share: string }[];
  anomalies: { date: string; title: string; detail: string }[];
  forecast: { next7Revenue: string; changeVsLast7: string } | null;
  /** 파일에 없어 계산하지 않은 항목 — 모델이 지어내지 않도록 알려준다 */
  unavailable: string[];
}

export interface AiRequest {
  question: string;
  context: AiContext;
}

export type AiResponse =
  | { mode: "llm"; answer: string; model: string }
  /** 키가 없거나 호출이 실패하면 클라이언트가 규칙 기반 엔진으로 답한다 */
  | { mode: "fallback"; reason: "not_configured" | "unavailable" | "refused" };

export type ParseResult = { ok: true; value: AiRequest } | { ok: false; error: string };

const isStr = (v: unknown): v is string => typeof v === "string";

export function parseAiRequest(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "본문이 비어 있습니다." };
  const { question, context } = body as Record<string, unknown>;
  if (!isStr(question) || !question.trim()) return { ok: false, error: "질문이 비어 있습니다." };
  if (question.length > QUESTION_MAX) return { ok: false, error: `질문은 ${QUESTION_MAX}자 이하여야 합니다.` };
  if (!context || typeof context !== "object") return { ok: false, error: "데이터 요약이 없습니다." };
  const c = context as Partial<AiContext>;
  if (!isStr(c.dataset) || !c.period || !Array.isArray(c.kpis) || !Array.isArray(c.channels)) {
    return { ok: false, error: "데이터 요약 형식이 올바르지 않습니다." };
  }
  if (JSON.stringify(context).length > CONTEXT_MAX_BYTES) return { ok: false, error: "데이터 요약이 너무 큽니다." };
  return { ok: true, value: { question: question.trim(), context: c as AiContext } };
}
