"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Anomaly } from "@/lib/types";
import { formatDateKR } from "@/lib/format";
import { useDrill } from "@/lib/drill";
import { SEVERITY_META } from "@/lib/ui";

/**
 * 이상치 목록 — 한 패널 안의 행 목록. 행을 펼치면 근거와 '이 시점 분석 보기'가 나온다.
 * unreadIds가 주어지면 미확인 행에 표식을 달고, 펼칠 때 확인 처리한다.
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
  const [openId, setOpenId] = useState<string | null>(null);
  const { toMoment } = useDrill();

  if (anomalies.length === 0) {
    return <p className="px-5 py-8 text-center text-sub text-ink-dim md:px-6">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {anomalies.map((a) => {
        const s = SEVERITY_META[a.severity];
        const open = openId === a.id;
        const unread = unreadIds?.has(a.id) ?? false;
        return (
          <li key={a.id}>
            <button
              onClick={() => {
                setOpenId(open ? null : a.id);
                if (unread) onRead?.(a.id);
              }}
              aria-expanded={open}
              className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-soft md:px-6"
            >
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${s.dot}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-body font-semibold text-ink">
                    {a.title}
                  </span>
                  <span className={`tabular shrink-0 text-body font-bold ${a.deltaPct >= 0 ? "text-positive" : "text-negative"}`}>
                    {a.deltaPct >= 0 ? "+" : ""}
                    {a.deltaPct.toFixed(0)}%
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 text-meta text-ink-dim">
                  <span className={`font-semibold ${s.text}`}>{s.label}</span>
                  <span aria-hidden>·</span>
                  <span className="tabular">{formatDateKR(a.date)}</span>
                  <span aria-hidden>·</span>
                  <span>{a.metric}</span>
                  {unread && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="font-semibold text-brand">미확인</span>
                    </>
                  )}
                </span>
              </span>
              <ChevronDown
                className={`mt-1 h-4 w-4 shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {open && (
              <div className="animate-fade-in px-5 pb-4 pl-10 md:px-6 md:pl-11">
                <p className="text-sub text-ink-soft">{a.description}</p>
                <p className="mt-1 text-meta text-ink-dim">{a.detail}</p>
                <button
                  onClick={() => toMoment(a.date, a.channel, a.metricKey)}
                  className="mt-2 inline-flex min-h-11 items-center text-sub font-semibold text-brand hover:text-brand-dark"
                >
                  이 시점 전후 분석 보기 →
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
