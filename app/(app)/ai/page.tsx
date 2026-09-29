"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Send } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/lib/store";
import { askDataQuestion } from "@/lib/ai";
import { SUGGESTED_QUESTIONS } from "@/lib/insight-generator";
import { btn, field } from "@/lib/ui";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function AiQueryPage() {
  const { ready, dataset } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  if (!ready) return <PageSkeleton />;
  if (!dataset) {
    return (
      <>
        <PageHeader title="데이터 질의" />
        <EmptyState />
      </>
    );
  }

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setThinking(true);
    const answer = await askDataQuestion(q, dataset.rows);
    setMessages((m) => [...m, { role: "ai", text: answer }]);
    setThinking(false);
  };

  return (
    <>
      <PageHeader
        title="데이터 질의"
        description={`${dataset.name}에 대해 자연어로 물어보세요. 데모에서는 최근 30일 데이터를 규칙 기반으로 계산해 답합니다.`}
      />

      <div className="card flex flex-col">
        <div className="min-h-[280px] flex-1 space-y-4 p-5 md:p-6" aria-live="polite">
          {messages.length === 0 && (
            <div className="py-6">
              <p className="text-body font-semibold text-ink">이런 질문을 할 수 있습니다</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="min-h-11 rounded-full border border-line-strong bg-surface px-4 text-sub text-ink-soft transition-colors hover:border-brand hover:text-brand"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <p className="max-w-[85%] rounded-card rounded-br-[4px] bg-brand px-4 py-3 text-body text-white">{m.text}</p>
              </div>
            ) : (
              <div key={i} className="max-w-[92%]">
                <p className="text-caption font-semibold text-ink-dim">InsightAI · 규칙 기반 답변</p>
                <p className="mt-1 rounded-card rounded-tl-[4px] bg-surface-soft px-4 py-3 text-body text-ink">{m.text}</p>
              </div>
            )
          )}
          {thinking && (
            <p className="flex items-center gap-2 text-sub text-ink-dim" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> 계산하고 있습니다…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-line p-4 md:p-5">
          {messages.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  disabled={thinking}
                  className="min-h-9 shrink-0 rounded-full border border-line px-3 text-meta text-ink-soft transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="ai-question" className="sr-only">
              질문
            </label>
            <input
              id="ai-question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 광고 효율이 가장 높은 채널은?"
              className={`${field} h-12 flex-1`}
            />
            <button type="submit" disabled={!input.trim() || thinking} className={`${btn.primary} h-12 px-4`} aria-label="질문 보내기">
              <Send className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">보내기</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
