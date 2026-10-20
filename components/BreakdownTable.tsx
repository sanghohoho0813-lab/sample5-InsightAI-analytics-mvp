"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import Sparkline from "./charts/Sparkline";
import { BreakdownRow } from "@/lib/analytics-engine";
import { COLORS } from "@/lib/palette";

type SortKey = "name" | "value" | "prev" | "change" | "share";

/**
 * 분해 표 — 항목 · 흐름 · 이번 기간 · 이전 기간 · 변화 · 비중을 한 줄에.
 * 머리를 누르면 그 열로 정렬하고, 항목 이름을 누르면 그 항목으로 범위를 좁힌다(다시 누르면 해제).
 * 좁은 화면에서는 이름 · 이번 기간(아래에 변화)만 남긴다.
 */
export default function BreakdownTable({
  rows,
  dimLabel,
  fmt,
  rate,
  neutralChange = false,
  selected,
  onPick,
}: {
  rows: BreakdownRow[];
  dimLabel: string;
  fmt: (v: number) => string;
  /** 전환율처럼 비율 지표 — 변화는 %p, 비중 없음 */
  rate: boolean;
  /** 광고비처럼 늘어난 것이 좋다 나쁘다 할 수 없는 지표는 변화를 중립색으로 */
  neutralChange?: boolean;
  /** 지금 범위로 고른 항목("all"이면 없음) */
  selected: string;
  /** 없으면 항목으로 좁힐 수 없다(고객 유형) */
  onPick?: (name: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "value", dir: -1 });
  const comparable = rows.some((r) => r.prev != null);
  const max = Math.max(1, ...rows.map((r) => r.value));

  const sorted = useMemo(() => {
    const v = (r: BreakdownRow) => (sort.key === "name" ? r.name : (r[sort.key] ?? Number.NEGATIVE_INFINITY));
    return [...rows].sort((a, b) => {
      const x = v(a);
      const y = v(b);
      const c = typeof x === "string" ? x.localeCompare(String(y), "ko") : (x as number) - (y as number);
      return c * sort.dir;
    });
  }, [rows, sort]);

  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }));

  const head = (key: SortKey, label: string, cls = "") => {
    const on = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
        className={`py-2 font-semibold ${key === "name" ? "text-left" : "text-right"} ${cls}`}
      >
        {/* 숫자 열은 화살표를 글자 앞에 두어 머리와 값의 오른쪽 끝을 맞춘다 */}
        <button
          onClick={() => toggle(key)}
          className={`inline-flex min-h-8 items-center gap-1 rounded-[6px] transition-colors hover:text-ink ${on ? "text-ink" : ""} ${
            key === "name" ? "" : "flex-row-reverse"
          }`}
        >
          {label}
          {on && sort.dir === 1 ? (
            <ArrowUp className="h-3 w-3" aria-hidden />
          ) : (
            <ArrowDown className={`h-3 w-3 ${on ? "" : "opacity-0"}`} aria-hidden />
          )}
        </button>
      </th>
    );
  };

  const changeText = (r: BreakdownRow) =>
    r.change == null ? (r.prev == null ? "–" : "신규") : `${r.change >= 0 ? "+" : "−"}${Math.abs(r.change).toFixed(rate ? 2 : 1)}${rate ? "%p" : "%"}`;
  const changeCls = (r: BreakdownRow) =>
    r.change == null || neutralChange ? "text-ink-soft" : r.change >= 0 ? "text-positive" : "text-negative";

  return (
    <table className="w-full text-sub">
      <caption className="sr-only">
        {dimLabel}별 값{comparable ? " · 이전 같은 기간과 비교" : ""} · 열 머리를 누르면 정렬합니다
      </caption>
      <thead>
        <tr className="whitespace-nowrap border-b border-line text-caption text-ink-dim">
          {head("name", dimLabel)}
          <th scope="col" className="hidden py-2 pl-4 text-left font-semibold md:table-cell">
            흐름
          </th>
          {head("value", "이번 기간")}
          {comparable && head("prev", "이전 기간", "hidden pl-4 sm:table-cell")}
          {comparable && head("change", "변화", "hidden pl-4 md:table-cell")}
          {!rate && head("share", "비중", "hidden pl-4 md:table-cell")}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r) => {
          const on = selected === r.name;
          const dim = selected !== "all" && !on;
          return (
            <tr
              key={r.name}
              onClick={onPick ? () => onPick(r.name) : undefined}
              className={`border-b border-line/70 transition-colors last:border-0 ${onPick ? "cursor-pointer hover:bg-surface-soft" : ""} ${
                on ? "bg-brand-soft/60" : ""
              }`}
            >
              <td className="py-3 pr-3">
                {onPick ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPick(r.name);
                    }}
                    aria-pressed={on}
                    className={`text-left font-semibold hover:text-brand ${on ? "text-brand" : "text-ink"}`}
                  >
                    {r.name}
                  </button>
                ) : (
                  <span className="font-semibold text-ink">{r.name}</span>
                )}
                {/* 크기 막대 — 가장 큰 항목 대비 */}
                <span className="mt-1.5 block h-1.5 max-w-[220px] rounded-full bg-surface-soft" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-brand transition-[width] duration-500"
                    style={{ width: `${(r.value / max) * 100}%`, opacity: dim ? 0.35 : 1 }}
                  />
                </span>
              </td>
              <td className="hidden py-3 pl-4 md:table-cell" aria-hidden>
                {r.trend.length > 1 && (
                  <Sparkline values={r.trend} width={112} height={28} stretch fill={false} color={dim ? "#b4bac4" : COLORS.brand} className="h-7 w-28" />
                )}
              </td>
              <td className="tabular whitespace-nowrap py-3 text-right font-semibold text-ink">
                {fmt(r.value)}
                {comparable && <span className={`block text-caption font-semibold md:hidden ${changeCls(r)}`}>{changeText(r)}</span>}
              </td>
              {comparable && (
                <td className="tabular hidden whitespace-nowrap py-3 pl-4 text-right text-ink-soft sm:table-cell">{r.prev == null ? "–" : fmt(r.prev)}</td>
              )}
              {comparable && (
                <td className={`tabular hidden whitespace-nowrap py-3 pl-4 text-right font-semibold md:table-cell ${changeCls(r)}`}>{changeText(r)}</td>
              )}
              {!rate && <td className="tabular hidden py-3 pl-4 text-right text-ink-soft md:table-cell">{r.share == null ? "–" : `${r.share.toFixed(1)}%`}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
