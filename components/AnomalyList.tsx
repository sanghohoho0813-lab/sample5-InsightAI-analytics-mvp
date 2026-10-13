"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Anomaly } from "@/lib/types";
import { formatMonthDay } from "@/lib/format";
import { investigationHref } from "@/lib/drill";
import { SEVERITY_META } from "@/lib/ui";

/** "10월 2일" · "10월 2일부터 4일간" */
export function whenText(a: Anomaly) {
  return a.days > 1 ? `${formatMonthDay(a.date)}부터 ${a.days}일간` : formatMonthDay(a.date);
}

/**
 * 이상치 목록 — 한 행을 누르면 조사 화면(무슨 변화 → 언제부터 → 어디서 → 근거 → 할 일)으로 간다.
 * unreadIds가 주어지면 미확인 행을 굵게 표시하고, 열 때 확인 처리한다.
 */
export default function AnomalyList({
  anomalies,
  unreadIds,
  onRead,
  empty = "이 기간에는 확인이 필요한 변화가 없습니다.",
}: {
  anomalies: Anomaly[];
  unreadIds?: Set<string>;
  onRead?: (id: string) => void;
  empty?: string;
}) {
  const pathname = usePathname();

  if (anomalies.length === 0) {
    return <p className="px-5 py-8 text-center text-sub text-ink-dim md:px-6">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {anomalies.map((a) => {
        const s = SEVERITY_META[a.severity];
        const unread = unreadIds?.has(a.id) ?? false;
        return (
          <li key={a.id}>
            <Link
              href={investigationHref(a.id, pathname === "/anomalies" ? undefined : pathname)}
              onClick={() => unread && onRead?.(a.id)}
              className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-soft md:px-6"
            >
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span
                    className={`text-body ${
                      !unreadIds ? "font-semibold text-ink" : unread ? "font-bold text-ink" : "font-medium text-ink-soft"
                    }`}
                  >
                    {a.title}
                    {unread && <span className="sr-only"> (미확인)</span>}
                  </span>
                  <span className={`tabular shrink-0 text-body font-bold ${a.deltaPct >= 0 ? "text-positive" : "text-negative"}`}>
                    {a.deltaPct >= 0 ? "+" : "−"}
                    {Math.abs(a.deltaPct).toFixed(0)}%
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-ink-dim">
                  <span className={`font-semibold ${s.text}`}>{s.label}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular">{whenText(a)}</span>
                  {a.ongoing && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-semibold text-negative">진행 중</span>
                    </>
                  )}
                </span>
              </span>
              <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
