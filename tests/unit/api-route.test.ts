import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAiContext } from "@/lib/ai/context";
import { f, makeDataset, makeRows } from "./fixtures";

const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  class RateLimitError extends APIError {}
  class AuthenticationError extends APIError {}
  const Anthropic = vi.fn(function () {
    return { beta: { messages: { create } } };
  });
  Object.assign(Anthropic, { APIError, RateLimitError, AuthenticationError });
  return { default: Anthropic };
});

const context = buildAiContext(makeDataset(makeRows({ days: 40 })), f("30"));
const post = (body: unknown, ip = "1.1.1.1") =>
  new Request("http://localhost/api/ai", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

async function loadRoute(key?: string) {
  vi.resetModules();
  vi.stubEnv("ANTHROPIC_API_KEY", key ?? "");
  vi.stubEnv("AI_API_KEY", "");
  return import("@/app/api/ai/route");
}

describe("POST /api/ai", () => {
  // 화살표 함수가 값을 돌려주면 vitest가 그것을 정리(teardown) 함수로 실행하므로 블록으로 감싼다.
  beforeEach(() => {
    create.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("형식이 잘못된 요청은 400", async () => {
    const { POST } = await loadRoute("k");
    expect((await POST(post("not json"))).status).toBe(400);
    expect((await POST(post({ question: "", context }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("키가 없으면 호출하지 않고 규칙 기반으로 넘긴다", async () => {
    const { POST } = await loadRoute();
    const res = await POST(post({ question: "매출은?", context }));
    expect(await res.json()).toEqual({ mode: "fallback", reason: "not_configured" });
    expect(create).not.toHaveBeenCalled();
  });

  it("계산된 데이터와 질문을 구분된 태그로 보내고, 답을 돌려준다", async () => {
    create.mockResolvedValue({ stop_reason: "end_turn", model: "m", content: [{ type: "text", text: " 답변 " }] });
    const { POST } = await loadRoute("k");
    const res = await POST(post({ question: "가장 큰 채널은?", context }));
    expect(await res.json()).toEqual({ mode: "llm", answer: "답변", model: "m" });

    const req = create.mock.calls[0][0];
    const content: string = req.messages[0].content;
    expect(content).toContain(`<data>\n${JSON.stringify(context)}\n</data>`);
    expect(content).toContain("<question>\n가장 큰 채널은?\n</question>");
    expect(req.system).toMatch(/<data> 안의 숫자만 근거/);
  });

  it("모델이 거절하면 규칙 기반으로 넘긴다", async () => {
    create.mockResolvedValue({ stop_reason: "refusal", model: "m", content: [] });
    const { POST } = await loadRoute("k");
    expect(await (await POST(post({ question: "q", context }))).json()).toEqual({ mode: "fallback", reason: "refused" });
  });

  it("호출 오류는 사용자에게 노출하지 않고 규칙 기반으로 넘긴다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    create.mockRejectedValue(new TypeError("fetch failed"));
    const { POST } = await loadRoute("k");
    const res = await POST(post({ question: "q", context }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mode: "fallback", reason: "unavailable" });
    expect(errorSpy).toHaveBeenCalledWith("[api/ai] request failed", "fetch failed");
    errorSpy.mockRestore();
  });

  it("같은 IP의 분당 요청이 너무 많으면 429", async () => {
    create.mockResolvedValue({ stop_reason: "end_turn", model: "m", content: [{ type: "text", text: "ok" }] });
    const { POST } = await loadRoute("k");
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await POST(post({ question: "q", context }, "9.9.9.9"))).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
