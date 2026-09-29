"use client";

import { useState } from "react";
import { Insight, Recommendation } from "@/lib/types";
import { useDrill } from "@/lib/drill";

const IMPACT = {
  positive: { label: "긍정", cls: "text-positive" },
  negative: { label: "주의", cls: "text-negative" },
  neutral: { label: "참고", cls: "text-ink-soft" },
} as const;

/** 인사이트 목록 — 무엇이 변했나(제목) → 수치 근거(설명) → 관련 데이터로 이동 */
export function InsightList({ insights, compact = false }: { insights: Insight[]; compact?: boolean }) {
  const { toSegment } = useDrill();
  const [openId, setOpenId] = useState<string | null>(null);

  if (insights.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sub text-ink-dim md:px-6">
        이 범위에서는 뚜렷한 변화가 발견되지 않았습니다. 기간을 넓혀보세요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {insights.map((ins) => {
        const impact = IMPACT[ins.impact];
        const open = openId === ins.id;
        return (
          <li key={ins.id} className="px-5 py-4 md:px-6">
            <p className="text-caption font-semibold text-ink-dim">
              {ins.category} · <span className={impact.cls}>{impact.label}</span>
            </p>
            <p className="mt-1 text-body font-semibold text-ink">{ins.title}</p>
            <p className="mt-1 text-sub text-ink-soft">{ins.description}</p>
            {!compact && open && <p className="animate-fade-in mt-2 text-meta text-ink-dim">{ins.detail}</p>}
            <div className="mt-1 flex flex-wrap items-center gap-x-4">
              {ins.drill && (
                <button
                  onClick={() => toSegment(ins.drill!)}
                  className="inline-flex min-h-11 items-center text-sub font-semibold text-brand hover:text-brand-dark"
                >
                  관련 데이터 보기 →
                </button>
              )}
              {!compact && (
                <button
                  onClick={() => setOpenId(open ? null : ins.id)}
                  aria-expanded={open}
                  className="inline-flex min-h-11 items-center text-sub font-medium text-ink-soft hover:text-ink"
                >
                  {open ? "해석 접기" : "해석 보기"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const PRIORITY = {
  high: { label: "우선", cls: "bg-brand-soft text-brand" },
  medium: { label: "권장", cls: "bg-surface-soft text-ink-soft border border-line" },
  low: { label: "검토", cls: "bg-surface-soft text-ink-dim border border-line" },
} as const;

/** 실행 제안 — 효과 수치는 추정치임을 밝힌다. */
export function RecommendationList({ items }: { items: Recommendation[] }) {
  return (
    <ol className="divide-y divide-line">
      {items.map((r) => {
        const p = PRIORITY[r.priority];
        return (
          <li key={r.id} className="px-5 py-4 md:px-6">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${p.cls}`}>{p.label}</span>
              <p className="text-body font-semibold text-ink">{r.title}</p>
            </div>
            <p className="mt-1 text-sub text-ink-soft">{r.description}</p>
            <p className="mt-1 text-meta text-ink-dim">
              예상 효과(추정) <b className="font-semibold text-ink">{r.expectedEffect}</b>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
