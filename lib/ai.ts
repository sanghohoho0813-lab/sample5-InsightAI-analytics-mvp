import { answerDataQuestion, generateInsights, generateRecommendations } from "./insight-generator";
import { DataRow, Insight, Recommendation } from "./types";

/**
 * AI Layer — 외부 LLM API 연결 지점.
 *
 * 서버에 AI_API_KEY가 설정되어 있으면 /api/ai 경유로 실제 LLM 응답을 사용하고,
 * 없으면 규칙 기반 Demo Insight Engine으로 동작한다.
 * 화면 코드는 이 세 함수만 사용하므로 추후 LLM 교체가 쉽다.
 */

async function tryRemote(payload: object): Promise<string | null> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.demo || !data.answer) return null;
    return data.answer as string;
  } catch {
    return null;
  }
}

export async function generateInsight(rows: DataRow[], rangeDays: 7 | 30 | 90): Promise<Insight[]> {
  return generateInsights({ rows, rangeDays });
}

export async function generateRecommendation(
  rows: DataRow[],
  rangeDays: 7 | 30 | 90
): Promise<Recommendation[]> {
  return generateRecommendations({ rows, rangeDays });
}

export async function askDataQuestion(question: string, rows: DataRow[]): Promise<string> {
  const remote = await tryRemote({ type: "question", question });
  if (remote) return remote;
  return answerDataQuestion(question, rows);
}
