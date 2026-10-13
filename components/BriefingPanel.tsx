"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Briefing, BriefPoint } from "@/lib/briefing";
import { useDrill } from "@/lib/drill";
import { signedKRW } from "@/lib/drivers";
import { formatKRW } from "@/lib/format";
import { DerivedField, Recommendation } from "@/lib/types";

const TONE = {
  positive: { dot: "bg-positive", sr: "좋은 변화" },
  negative: { dot: "bg-negative", sr: "주의할 변화" },
  neutral: { dot: "bg-ink-dim", sr: "참고" },
} as const;

export const PRIORITY = {
  high: { label: "우선", cls: "bg-brand-soft text-brand" },
  medium: { label: "권장", cls: "border border-line bg-surface text-ink-soft" },
  low: { label: "검토", cls: "border border-line bg-surface text-ink-dim" },
} as const;

const linkCls = "mt-3 inline-flex min-h-11 items-center gap-1 text-sub font-semibold text-brand hover:text-brand-dark";

/** 근거·계산 방식 — 결론 아래에 접어 두고, 펼치면 숫자를 확인할 수 있다. */
export function Evidence({ items, basis }: { items?: string[]; basis?: string }) {
  if (!items?.length) return basis ? <p className="mt-2 text-caption text-ink-dim">{basis}</p> : null;
  return (
    <details className="group mt-2">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-meta font-semibold text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
        근거 {items.length}개 보기
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="mt-1 space-y-1 border-l-2 border-line pl-3 text-meta text-ink-soft">
        {items.map((e) => (
          <li key={e} className="tabular">
            {e}
          </li>
        ))}
      </ul>
      {basis && <p className="mt-2 text-caption text-ink-dim">계산: {basis}</p>}
    </details>
  );
}

function Cell({
  n,
  label,
  point,
  empty,
  extra,
}: {
  n: number;
  label: string;
  point: BriefPoint | null;
  empty: string;
  extra?: React.ReactNode;
}) {
  const { follow } = useDrill();
  const id = `brief-${n}`;
  return (
    <section className="flex flex-col p-5 md:p-6" aria-labelledby={id}>
      <h3 id={id} className="flex items-center gap-2 text-caption font-semibold text-ink-dim">
        <span className="tabular flex h-5 w-5 items-center justify-center rounded-full bg-surface-soft text-[12px] font-bold text-ink-soft ring-1 ring-line-strong">
          {n}
        </span>
        {label}
      </h3>
      {point ? (
        <>
          <p className="mt-3 flex items-start gap-2 text-lead font-bold leading-snug text-ink">
            <span className={`mt-[9px] h-2 w-2 shrink-0 rounded-full ${TONE[point.tone].dot}`} aria-hidden />
            <span>
              <span className="sr-only">{TONE[point.tone].sr}: </span>
              {point.title}
            </span>
          </p>
          <p className="mt-1.5 text-sub text-ink-soft">{point.body}</p>
          <Evidence items={point.evidence} basis={point.basis} />
          {extra}
          {point.link && (
            <button onClick={() => follow(point.link!, point.title)} className={`${linkCls} mt-auto self-start pt-2`}>
              {point.link.label} →
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sub text-ink-soft">{empty}</p>
      )}
    </section>
  );
}

/** 실행 제안 한 줄 — 무엇을(제목) → 어떻게(설명) → 왜(근거) */
export function ActionItem({ a, n, compact = false }: { a: Recommendation; n: number; compact?: boolean }) {
  const { follow } = useDrill();
  const p = PRIORITY[a.priority];
  const body = (
    <>
      <span className="tabular mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-caption font-bold text-ink-soft ring-1 ring-line-strong">
        {n}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body font-semibold text-ink">{a.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${p.cls}`}>{p.label}</span>
        </span>
        <span className="mt-1 block text-sub text-ink-soft">{a.description}</span>
        {!compact && <span className="mt-1 block text-meta text-ink-dim">근거 · {a.evidence}</span>}
      </span>
      {a.link && <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-dim" aria-hidden />}
    </>
  );
  const cls = "flex w-full items-start gap-3 py-4 text-left";
  return a.link ? (
    <button onClick={() => follow(a.link!, a.title)} className={`${cls} rounded-control transition-colors hover:bg-surface/70`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/**
 * 경영 브리핑 — 대시보드 맨 위. 숫자 카드 대신 문장으로 답한다.
 * 이번 기간에 무슨 일이 있었나 → 가장 큰 변화 → 가능성 높은 원인 → 지금 확인할 위험 → 다음 행동
 */
export default function BriefingPanel({ b, period, derived = [] }: { b: Briefing; period: string; derived?: DerivedField[] }) {
  const up = (b.revenueDelta ?? 0) >= 0;
  const NAMES: Partial<Record<DerivedField, string>> = { orders: "주문 수", channel: "채널", product: "상품", adSpend: "광고비" };
  const missingCols = derived.map((f) => NAMES[f]).filter(Boolean).join("·");
  return (
    <section className="card overflow-hidden" aria-labelledby="brief-title">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-end md:justify-between md:gap-8 md:p-6">
        <div className="min-w-0">
          <p className="text-meta font-semibold text-ink-dim">이번 기간 요약 · {period}</p>
          <h2 id="brief-title" className="mt-1.5 text-title font-bold tracking-tight text-ink">
            {b.headline}
          </h2>
        </div>
        <div className="shrink-0 md:text-right">
          <p className="text-meta text-ink-dim">{b.span} 매출</p>
          <p className="tabular text-kpi font-bold tracking-tight text-ink">{formatKRW(b.revenue.value)}</p>
          {b.revenueDelta != null ? (
            <p className={`tabular text-meta font-semibold ${up ? "text-positive" : "text-negative"}`}>
              {signedKRW(b.revenueDelta)} <span className="font-medium text-ink-dim">· 이전 {formatKRW(b.revenue.prevValue)}</span>
            </p>
          ) : (
            <p className="text-meta text-ink-dim">이전 같은 기간 데이터 없음</p>
          )}
        </div>
      </div>

      <div className="grid divide-y divide-line border-t border-line md:grid-cols-3 md:divide-x md:divide-y-0">
        <Cell n={1} label="가장 큰 변화" point={b.change} empty="이 범위에서는 뚜렷하게 움직인 항목이 없습니다." />
        <Cell n={2} label="가능성 높은 원인" point={b.cause} empty={b.causeHint || "원인을 나눠볼 만큼 큰 변화가 없습니다."} />
        <Cell
          n={3}
          label="지금 확인할 위험"
          point={b.risk}
          empty="지금 바로 확인이 필요한 위험 신호는 없습니다."
          extra={b.otherRisks > 0 ? <p className="mt-2 text-meta text-ink-dim">그 외 확인할 것 {b.otherRisks}건 · 아래 목록 참고</p> : undefined}
        />
      </div>

      <div className="border-t border-line bg-surface-soft px-5 pt-4 md:px-6">
        <h3 className="text-meta font-semibold text-ink-dim">추천 다음 행동</h3>
        {b.actions.length ? (
          <ol className="divide-y divide-line">
            {b.actions.map((a, i) => (
              <li key={a.id}>
                <ActionItem a={a} n={i + 1} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-4 text-sub text-ink-soft">
            {missingCols
              ? `이 범위에서 근거를 들어 제안할 행동이 없습니다. ${missingCols} 열이 있으면 원인과 할 일을 더 구체적으로 계산합니다.`
              : "이 범위에서는 근거를 들어 제안할 만큼 큰 변화가 없습니다. 기간을 넓히면 더 많은 변화를 비교합니다."}
          </p>
        )}
      </div>
    </section>
  );
}
