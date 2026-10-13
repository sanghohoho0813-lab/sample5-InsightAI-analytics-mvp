"use client";

import { Contribution, signed, signedKRW } from "@/lib/drivers";
import { formatKRW } from "@/lib/format";

/**
 * 어디서 변했나 — 채널(또는 상품)별 매출 증감액을 가운데 축 기준 막대로.
 * 도넛처럼 '비중'이 아니라 '변화를 누가 만들었나'를 보여준다.
 * 비교할 이전 기간이 없으면 이번 기간 매출 비중을 보여준다.
 * 막대는 HTML이라 좁은 화면에서도 줄어들지 않고 한 줄씩 읽힌다.
 */
export default function ContributionBars({
  items,
  comparable,
  active,
  onSelect,
}: {
  items: Contribution[];
  comparable: boolean;
  active: string;
  onSelect?: (name: string) => void;
}) {
  if (!items.length) return null;
  const total = items.reduce((a, i) => a + i.cur, 0) || 1;
  const values = comparable ? items.map((i) => i.delta) : items.map((i) => i.cur);
  const max = Math.max(...values.map(Math.abs), 1);
  const diverging = comparable && values.some((v) => v < 0) && values.some((v) => v > 0);
  const rows = comparable ? items : [...items].sort((a, b) => b.cur - a.cur);

  return (
    <ul className="space-y-0.5">
      {rows.map((i) => {
        const v = comparable ? i.delta : i.cur;
        const w = `${(Math.abs(v) / max) * (diverging ? 50 : 100)}%`;
        const neg = v < 0;
        const on = active === i.name;
        const dim = active !== "all" && !on;
        // 이름·금액을 윗줄에, 막대를 아랫줄 전체 폭에 둬서 좁은 패널에서도 막대 길이를 비교할 수 있게 한다.
        const content = (
          <>
            <span className="flex items-baseline gap-2">
              <span className={`min-w-0 flex-1 truncate text-sub ${on ? "font-semibold text-brand" : "text-ink"}`}>{i.name}</span>
              <span className="tabular shrink-0 text-sub font-semibold text-ink">{comparable ? signedKRW(i.delta) : formatKRW(i.cur)}</span>
              <span className={`tabular w-11 shrink-0 text-right text-meta ${comparable ? (neg ? "text-negative" : "text-positive") : "text-ink-dim"}`}>
                {comparable ? signed(i.pct) : `${((i.cur / total) * 100).toFixed(0)}%`}
              </span>
            </span>
            <span className="relative mt-1.5 block h-2 rounded-full bg-surface-soft" aria-hidden>
              {diverging && <span className="absolute inset-y-[-3px] left-1/2 w-px bg-line-strong" />}
              <span
                className={`absolute inset-y-0 rounded-full ${neg ? "bg-negative" : comparable ? "bg-positive" : "bg-brand"} ${dim ? "opacity-35" : ""}`}
                style={diverging ? (neg ? { right: "50%", width: w } : { left: "50%", width: w }) : { left: 0, width: w }}
              />
            </span>
          </>
        );
        return (
          <li key={i.name}>
            {onSelect ? (
              <button
                onClick={() => onSelect(on ? "all" : i.name)}
                aria-pressed={on}
                className="block w-full rounded-control px-2 py-2 text-left transition-colors hover:bg-surface-soft"
              >
                {content}
                <span className="sr-only">{on ? " · 선택 해제" : " · 이것만 보기"}</span>
              </button>
            ) : (
              <div className="px-2 py-2">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
