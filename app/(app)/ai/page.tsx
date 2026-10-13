"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LoaderCircle, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import FilterToolbar from "@/components/FilterToolbar";
import { useApp } from "@/lib/store";
import { useDrill } from "@/lib/drill";
import { askDataQuestion, Answer } from "@/lib/ai/client";
import { QUESTION_MAX } from "@/lib/ai/contract";
import { suggestedQuestions } from "@/lib/qa";
import { btn, field } from "@/lib/ui";

interface Entry extends Answer {
  id: string;
  question: string;
}

const isEntry = (x: unknown): x is Entry =>
  !!x && typeof x === "object" && typeof (x as Entry).question === "string" && typeof (x as Entry).text === "string" && Array.isArray((x as Entry).evidence);

function AnswerCard({ e }: { e: Entry }) {
  const { follow } = useDrill();
  return (
    <article className="card p-5 md:p-6" aria-label={`질문: ${e.question}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lead font-bold text-ink">{e.question}</h2>
        <p className="text-caption text-ink-dim">
          {e.scope} · {e.source === "llm" ? "AI가 쓴 문장(근거는 같은 계산)" : "규칙 기반 계산"}
        </p>
      </div>
      <p className="mt-3 text-body text-ink">{e.text}</p>
      {e.evidence.length > 0 && (
        <div className="mt-4">
          <h3 className="text-caption font-semibold text-ink-dim">근거 · 화면과 같은 계산</h3>
          <ul className="mt-1.5 space-y-1 border-l-2 border-line pl-3 text-meta text-ink-soft">
            {e.evidence.map((x) => (
              <li key={x} className="tabular">
                {x}
              </li>
            ))}
          </ul>
        </div>
      )}
      {e.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-5">
          {e.links.map((l) => (
            <button key={l.label} onClick={() => follow(l, e.question)} className={btn.quiet}>
              {l.label} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

/**
 * 데이터 질의 — 일반 대화가 아니라 '지금 열린 데이터'에 묻는 도구.
 * 질문은 화면과 같은 범위·계산으로 답하고, 답마다 근거와 이어서 볼 화면을 붙인다.
 */
export default function AiQueryPage() {
  const { ready, dataset, filters } = useApp();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 질문 기록은 데이터셋별로 이 탭이 열려 있는 동안 유지한다(다른 화면에 다녀와도 남게).
  const key = dataset ? `insightai.qa.${dataset.id}` : null;
  useEffect(() => {
    if (!key) return;
    try {
      const raw = JSON.parse(sessionStorage.getItem(key) ?? "[]");
      setEntries(Array.isArray(raw) ? raw.filter(isEntry) : []);
    } catch {
      setEntries([]);
    }
  }, [key]);
  useEffect(() => {
    if (!key) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(entries.slice(0, 20)));
    } catch {
      // 저장 공간을 쓸 수 없으면 이 화면에서만 유지
    }
  }, [key, entries]);

  const suggestions = useMemo(() => (dataset ? suggestedQuestions(dataset, filters) : []), [dataset, filters]);

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
    if (!q || pending) return;
    setInput("");
    setPending(q);
    const answer = await askDataQuestion(q, dataset, filters);
    setEntries((list) => [{ ...answer, id: `${Date.now()}`, question: q }, ...list]);
    setPending(null);
  };

  return (
    <>
      <PageHeader
        title="데이터 질의"
        description={`${dataset.name}에 대해 묻고, 화면과 같은 계산으로 답을 받습니다`}
        actions={
          entries.length > 0 ? (
            <button onClick={() => setEntries([])} disabled={!!pending} className={btn.secondary}>
              기록 지우기
            </button>
          ) : undefined
        }
      />
      <FilterToolbar dataset={dataset} />

      <section className="card p-5 md:p-6" aria-labelledby="ask-title">
        <h2 id="ask-title" className="sr-only">
          질문하기
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <label htmlFor="ai-question" className="sr-only">
            데이터에 대한 질문
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input
              id="ai-question"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={suggestions[0] ? `예: ${suggestions[0].question}` : "예: 매출이 왜 늘었어?"}
              maxLength={QUESTION_MAX}
              autoComplete="off"
              className={`${field} h-12 w-full pl-11 text-body`}
            />
          </div>
          <button type="submit" disabled={!input.trim() || !!pending} className={`${btn.primary} h-12`}>
            질문하기
          </button>
        </form>

        <div className="mt-5">
          <h3 className="text-meta font-semibold text-ink-soft">이 데이터에서 바로 답할 수 있는 질문</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s.question}>
                <button
                  onClick={() => ask(s.question)}
                  disabled={!!pending}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-left text-sub text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
                >
                  {s.question}
                  <span className="text-caption text-ink-dim">{s.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-meta text-ink-dim">
          위 범위({filters.channel === "all" ? "전체 채널" : filters.channel}
          {filters.product === "all" ? "" : ` · ${filters.product}`})의 데이터만 씁니다. 데이터에 없는 내용은 추측하지 않고 계산할 수 없다고 답합니다.
        </p>
      </section>

      <div className="mt-6 space-y-4" aria-live="polite">
        {pending && (
          <div className="card flex items-center gap-3 p-5 md:p-6" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand" aria-hidden />
            <p className="text-body text-ink-soft">
              ‘{pending}’ — 계산하고 있습니다…
            </p>
          </div>
        )}
        {entries.map((e) => (
          <AnswerCard key={e.id} e={e} />
        ))}
        {!pending && entries.length === 0 && (
          <p className="rounded-card border border-dashed border-line-strong px-5 py-8 text-center text-sub text-ink-dim">
            질문하면 답과 함께 계산 근거, 이어서 볼 화면이 여기에 쌓입니다.
          </p>
        )}
      </div>
    </>
  );
}
