"use client";

import { Insight, Recommendation } from "@/lib/types";
import { useDrill } from "@/lib/drill";
import { ActionItem, Evidence } from "./BriefingPanel";

const IMPACT = {
  positive: { label: "긍정", cls: "text-positive" },
  negative: { label: "주의", cls: "text-negative" },
  neutral: { label: "참고", cls: "text-ink-soft" },
} as const;

/** 인사이트 목록 — 결론(제목) → 수치(설명) → 근거·계산 방식 → 관련 데이터로 이동 */
export function InsightList({ insights, compact = false }: { insights: Insight[]; compact?: boolean }) {
  const { toSegment } = useDrill();

  if (insights.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sub text-ink-dim md:px-6">
        이 범위에서는 근거를 들어 말할 만한 변화가 없습니다. 기간을 넓혀보세요.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {insights.map((ins) => {
        const impact = IMPACT[ins.impact];
        return (
          <li key={ins.id} className="px-5 py-4 md:px-6">
            <p className="text-caption font-semibold text-ink-dim">
              {ins.category} · <span className={impact.cls}>{impact.label}</span>
            </p>
            <p className="mt-1 text-body font-semibold text-ink">{ins.title}</p>
            <p className="mt-1 text-sub text-ink-soft">{ins.description}</p>
            {!compact && <Evidence items={ins.evidence} basis={ins.basis} />}
            {ins.drill && (
              <button
                onClick={() => toSegment(ins.drill!, ins.title)}
                className="mt-1 inline-flex min-h-11 items-center text-sub font-semibold text-brand hover:text-brand-dark"
              >
                관련 데이터 보기 →
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 실행 제안 — 각 제안은 특정 발견에서 나오고, 그 계산값을 근거로 단다. */
export function RecommendationList({ items }: { items: Recommendation[] }) {
  if (items.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sub text-ink-dim md:px-6">
        근거를 들어 제안할 행동이 아직 없습니다. 주문 수·채널·상품·광고비 열이 있거나 기간이 길면 제안이 늘어납니다.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-line px-5 md:px-6">
      {items.map((r, i) => (
        <li key={r.id}>
          <ActionItem a={r} n={i + 1} />
        </li>
      ))}
    </ol>
  );
}
