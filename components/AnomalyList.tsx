"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Anomaly } from "@/lib/types";
import { AnomalyTrace } from "@/lib/anomaly-engine";
import Sparkline from "./charts/Sparkline";
import { anomalyTone } from "./AnomalyStrip";
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
 * traces가 주어지면(넓은 목록) 행마다 변화 전후의 작은 추이를 붙인다.
 */
export default function AnomalyList({
  anomalies,
  unreadIds,
  onRead,
  traces,
  empty = "이 기간에는 확인이 필요한 변화가 없습니다.",
}: {
  anomalies: Anomaly[];
  unreadIds?: Set<string>;
  onRead?: (id: string) => void;
  traces?: Map<string, AnomalyTrace | null>;
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
        const trace = traces?.get(a.id);
        const delta = (
          <span className={`tabular shrink-0 text-body font-bold ${a.deltaPct >= 0 ? "text-positive" : "text-negative"}`}>
            {a.deltaPct >= 0 ? "+" : "−"}
            {Math.abs(a.deltaPct).toFixed(0)}%
          </span>
        );
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
                  </span>
                  {/* 넓은 목록에서는 추이 옆에 둔다 */}
                  <span className={traces ? "sm:hidden" : ""}>{delta}</span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-ink-dim">
                  {unread && (
                    <span className="rounded-full bg-brand-soft px-1.5 py-px text-caption font-semibold text-brand">미확인</span>
                  )}
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
              {traces && (
                <span className="hidden shrink-0 items-center gap-4 self-center sm:flex">
                  <span className="block h-9 w-28 lg:w-36" aria-hidden>
                    {trace && (
                      <Sparkline
                        values={trace.values}
                        width={144}
                        height={36}
                        stretch
                        fill={false}
                        color="#b4bac4"
                        highlight={{ from: trace.from, to: trace.to, color: anomalyTone(a) }}
                        className="h-9 w-full"
                      />
                    )}
                  </span>
                  <span className="w-14 text-right">{delta}</span>
                </span>
              )}
              <ChevronRight className={`mt-1 h-4 w-4 shrink-0 text-ink-dim ${traces ? "sm:mt-0 sm:self-center" : ""}`} aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
