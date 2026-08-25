import { NextResponse } from "next/server";

/**
 * LLM 프록시 엔드포인트.
 * AI_API_KEY가 설정된 경우 실제 LLM API(Claude 등)를 호출하도록 확장하는 지점이다.
 * 키가 없으면 { demo: true }를 반환하고, 클라이언트는 Demo Insight Engine으로 대체한다.
 */
export async function POST(req: Request) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ demo: true });
  }

  const body = await req.json().catch(() => ({}));
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: `당신은 비즈니스 데이터 분석가입니다. 다음 질문에 한국어로 간결하게 답하세요.\n질문: ${body.question ?? ""}`,
          },
        ],
      }),
    });
    if (!res.ok) return NextResponse.json({ demo: true });
    const data = await res.json();
    const answer = data?.content?.[0]?.text;
    return NextResponse.json(answer ? { answer } : { demo: true });
  } catch {
    return NextResponse.json({ demo: true });
  }
}
