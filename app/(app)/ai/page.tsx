"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, Send, Sparkles } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/lib/store";
import { askDataQuestion } from "@/lib/ai";
import { SUGGESTED_QUESTIONS } from "@/lib/insight-generator";

interface Message {
  role: "user" | "ai";
  text: string;
}

export default function AiQueryPage() {
  const { dataset } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  if (!dataset) {
    return (
      <>
        <PageHeader subtitle="데이터에 자연어로 물어보세요" />
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
    // 분석하는 듯한 짧은 지연 연출
    const [answer] = await Promise.all([
      askDataQuestion(q, dataset.rows),
      new Promise((r) => setTimeout(r, 1100)),
    ]);
    setMessages((m) => [...m, { role: "ai", text: answer }]);
    setThinking(false);
  };

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · 데이터에 자연어로 물어보세요`} />

      <div className="card flex min-h-[62dvh] flex-col p-4 md:p-5">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center animate-fade-up">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark shadow-xl shadow-brand/30">
                <Bot className="h-7 w-7 text-white" />
              </span>
              <p className="mt-4 text-[15px] font-semibold">무엇이 궁금하신가요?</p>
              <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ink-soft">
                업로드한 데이터를 기반으로 AI가 바로 계산해 답합니다.
              </p>
            </div>
          )}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end animate-fade-up">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[13.5px] leading-relaxed text-white shadow-lg shadow-brand/20">
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-2.5 animate-fade-up">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
                  <Sparkles className="h-4 w-4 text-brand" />
                </span>
                <p className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-surface-soft px-4 py-2.5 text-[13.5px] leading-relaxed text-ink">
                  {m.text}
                </p>
              </div>
            )
          )}
          {thinking && (
            <div className="flex items-center gap-2.5 animate-fade-in">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft">
                <LoaderCircle className="h-4 w-4 animate-spin text-brand" />
              </span>
              <span className="text-[12.5px] text-ink-dim">데이터를 분석하고 있습니다…</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={thinking}
                className="rounded-full border border-line bg-surface-soft px-3 py-1.5 text-[12px] text-ink-soft transition-colors hover:border-brand hover:text-ink disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="예: 광고 효율이 가장 높은 채널은?"
              className="h-11 flex-1 rounded-xl border border-line bg-surface-soft px-4 text-[13.5px] outline-none transition-colors placeholder:text-ink-dim focus:border-brand"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark disabled:opacity-50"
              aria-label="질문 보내기"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
