"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, Copy, CornerDownRight, LoaderCircle, Search } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import FilterToolbar from "@/components/FilterToolbar";
import { useApp } from "@/lib/store";
import { useDrill } from "@/lib/drill";
import { askDataQuestion, Answer } from "@/lib/ai/client";
import { QUESTION_MAX } from "@/lib/ai/contract";
import { Suggestion, suggestedQuestions } from "@/lib/qa";
import { btn, field } from "@/lib/ui";

interface Entry extends Answer {
  id: string;
  question: string;
}

const isEntry = (x: unknown): x is Entry =>
  !!x && typeof x === "object" && typeof (x as Entry).question === "string" && typeof (x as Entry).text === "string" && Array.isArray((x as Entry).evidence);

function AnswerCard({ e, latest, followUps, onAsk }: { e: Entry; latest: boolean; followUps: Suggestion[]; onAsk: (q: string) => void }) {
  const { follow } = useDrill();
  const { showToast } = useApp();
  const [copied, setCopied] = useState(false);

  // 답을 메신저·메일에 붙여 넣을 수 있게 — 질문 · 답 · 근거를 한 덩어리로
  const copy = async () => {
    const text = [`Q. ${e.question}`, `A. ${e.text}`, ...(e.evidence.length ? ["근거", ...e.evidence.map((x) => `- ${x}`)] : []), `(${e.scope})`].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      showToast("이 브라우저에서는 복사할 수 없습니다. 답을 직접 선택해 복사해주세요.", "error");
    }
  };

  return (
    <article className={`card p-5 md:p-6 ${latest ? "animate-fade-up" : ""}`} aria-label={`질문: ${e.question}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lead font-bold text-ink">{e.question}</h2>
          <p className="mt-0.5 text-caption text-ink-dim">
            {e.scope} · {e.source === "llm" ? "AI가 쓴 문장(근거는 같은 계산)" : "규칙 기반 계산"}
          </p>
        </div>
        <button
          onClick={copy}
          className="-mr-2 -mt-1 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control px-2 text-meta font-semibold text-ink-dim transition-colors hover:bg-surface-soft hover:text-ink"
          aria-label={copied ? "복사했습니다" : `답 복사: ${e.question}`}
        >
          {copied ? <Check className="h-4 w-4 text-positive" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{copied ? "복사했어요" : "복사"}</span>
        </button>
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
      {/* 가장 최근 답에만 — 아직 묻지 않은, 이 데이터로 답할 수 있는 다음 질문 */}
      {latest && followUps.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <h3 className="text-caption font-semibold text-ink-dim">이어서 물어보기</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {followUps.map((f) => (
              <li key={f.question}>
                <button
                  onClick={() => onAsk(f.question)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-sub font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                >
                  <CornerDownRight className="h-3.5 w-3.5" aria-hidden />
                  {f.question}
                </button>
              </li>
            ))}
          </ul>
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
  const { ready, dataset, filters, showToast } = useApp();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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
  const asked = useMemo(() => new Set(entries.map((e) => e.question)), [entries]);

  // '/'를 누르면 어디서든 질문 칸으로(입력 중일 때는 그대로 글자 입력)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    // 답이 쌓이는 자리로 — 좁은 화면에서 추천 질문 아래로 답이 숨어 버리지 않게
    requestAnimationFrame(() =>
      resultsRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })
    );
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
            <button
              onClick={() => {
                const before = entries;
                setEntries([]);
                showToast("질문 기록을 지웠습니다.", "info", { label: "되돌리기", onClick: () => setEntries(before) });
              }}
              disabled={!!pending}
              className={btn.secondary}
            >
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
              className={`${field} h-12 w-full pl-11 text-body sm:pr-12`}
            />
            <kbd
              className="pointer-events-none absolute right-3 top-1/2 hidden h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-[6px] border border-line-strong bg-surface-soft px-1.5 text-caption font-semibold text-ink-dim sm:flex"
              aria-hidden
            >
              /
            </kbd>
          </div>
          <button type="submit" disabled={!input.trim() || !!pending} className={`${btn.primary} h-12`}>
            질문하기
          </button>
        </form>

        <div className="mt-5">
          <h3 className="text-meta font-semibold text-ink-soft">이 데이터에서 바로 답할 수 있는 질문</h3>
          <ul className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {suggestions.map((s) => (
              <li key={s.question}>
                {/* 좁은 화면에서는 한 줄짜리 목록, 넓은 화면에서는 알약 모양 */}
                <button
                  onClick={() => ask(s.question)}
                  disabled={!!pending}
                  className={`flex w-full items-center gap-3 rounded-control border px-4 py-3 text-left text-sub transition-colors hover:border-brand hover:text-brand disabled:opacity-50 sm:min-h-11 sm:w-auto sm:rounded-full sm:py-0 ${
                    asked.has(s.question) ? "border-line bg-surface-soft text-ink-soft" : "border-line-strong bg-surface text-ink"
                  }`}
                >
                  {asked.has(s.question) && <Check className="h-4 w-4 shrink-0 text-positive" aria-label="물어본 질문" />}
                  <span className="min-w-0 flex-1">
                    {s.question}
                    <span className="mt-0.5 block text-caption text-ink-dim sm:ml-2 sm:mt-0 sm:inline">{s.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim sm:hidden" aria-hidden />
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

      <div ref={resultsRef} className="mt-6 scroll-mt-20 space-y-4 lg:scroll-mt-24" aria-live="polite">
        {pending && (
          <div className="card flex items-center gap-3 p-5 md:p-6" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand" aria-hidden />
            <p className="text-body text-ink-soft">
              ‘{pending}’ — 계산하고 있습니다…
            </p>
          </div>
        )}
        {entries.map((e, i) => (
          <AnswerCard
            key={e.id}
            e={e}
            latest={i === 0 && !pending}
            followUps={suggestions.filter((x) => !asked.has(x.question)).slice(0, 3)}
            onAsk={ask}
          />
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
