"use client";

import { AlertTriangle, Check, Minus } from "lucide-react";
import Sparkline from "@/components/charts/Sparkline";
import { Briefing } from "@/lib/briefing";
import { Contribution, signed, signedKRW } from "@/lib/drivers";
import { formatKRW } from "@/lib/format";
import { Investigation } from "@/lib/investigate";
import { Anomaly } from "@/lib/types";
import { SEVERITY_META } from "@/lib/ui";

/**
 * 소개 화면의 제품 미리보기 — 실제 샘플 데이터를 실제 엔진으로 계산한 결과를 작게 보여준다.
 * 꾸밈용 그림이 아니라 제품이 내놓는 결과 그대로이며, 화면 읽기 프로그램에는 본문 설명으로 대신한다.
 */

/** 앱 창 모양 틀 */
export function WindowFrame({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[18px] border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(24,28,36,0.35)] ${className}`}>
      <div className="flex h-10 items-center gap-2 border-b border-line bg-surface-soft px-4">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="ml-2 truncate text-caption font-medium text-ink-dim">{title}</span>
      </div>
      {children}
    </div>
  );
}

const DOT = { positive: "bg-positive", negative: "bg-negative", neutral: "bg-ink-dim" } as const;

/** 대시보드 브리핑 축소판 */
export function BriefingPreview({ b, trend, period }: { b: Briefing; trend: number[]; period: string }) {
  const up = (b.revenueDelta ?? 0) >= 0;
  const cells = [
    ["가장 큰 변화", b.change],
    ["가능성 높은 원인", b.cause],
    ["지금 확인할 위험", b.risk],
  ] as const;
  return (
    <div>
      <div className="relative bg-[linear-gradient(180deg,#f2f7ff_0%,#ffffff_100%)] px-5 pb-4 pt-5">
        <span className="absolute inset-x-0 top-0 h-[3px] bg-brand" />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[12px] text-ink-dim">
              <span className="rounded-full bg-brand px-2 py-0.5 font-semibold text-white">이번 기간 요약</span>
              {period}
            </p>
            <p className="mt-2 text-[19px] font-bold leading-snug tracking-[-0.02em] text-ink">{b.headline}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-[22px] font-bold tracking-[-0.02em] text-ink">{formatKRW(b.revenue.value)}</p>
            {b.revenueDelta != null && (
              <p className={`tabular text-[12px] font-semibold ${up ? "text-positive" : "text-negative"}`}>{signedKRW(b.revenueDelta)}</p>
            )}
          </div>
        </div>
        <Sparkline values={trend} width={420} height={44} stretch className="mt-3 h-11 w-full" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-line border-t border-line">
        {cells.map(([label, p], i) => (
          <div key={label} className="min-w-0 p-3.5">
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-dim">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{i + 1}</span>
              {label}
            </p>
            {p ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-semibold leading-snug text-ink">
                <span className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[p.tone]}`} />
                <span className="line-clamp-2">{p.title}</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-ink-dim">해당 없음</p>
            )}
          </div>
        ))}
      </div>
      {b.actions[0] && (
        <div className="border-t border-line bg-surface-soft px-5 py-3">
          <p className="text-[11.5px] font-semibold text-ink-dim">추천 다음 행동</p>
          <p className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-bold text-ink-soft ring-1 ring-line-strong">
              1
            </span>
            <span className="truncate">{b.actions[0].title}</span>
            <span className="ml-auto shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">우선</span>
          </p>
        </div>
      )}
    </div>
  );
}

/** 떠 있는 알림 카드 — '평소와 달랐던 날' 한 건 */
export function AlertCard({ a }: { a: Anomaly }) {
  const s = SEVERITY_META[a.severity];
  return (
    <div className="w-[260px] rounded-[14px] border border-line bg-surface p-4 shadow-[0_20px_50px_-20px_rgba(24,28,36,0.35)]">
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-dim">
        <AlertTriangle className="h-3.5 w-3.5 text-negative" /> 평소와 달랐던 날
      </p>
      <p className="mt-2 text-[13.5px] font-semibold leading-snug text-ink">{a.title}</p>
      <p className="mt-1 flex items-center gap-2 text-[12px] text-ink-dim">
        <span className={`font-semibold ${s.text}`}>{s.label}</span>
        <span className="tabular">{Number(a.date.slice(5, 7))}월 {Number(a.date.slice(8))}일</span>
        <span className={`tabular ml-auto font-bold ${a.deltaPct < 0 ? "text-negative" : "text-positive"}`}>
          {a.deltaPct < 0 ? "−" : "+"}
          {Math.abs(a.deltaPct).toFixed(0)}%
        </span>
      </p>
    </div>
  );
}

/** 업로드 진단 미리보기 — 예시 CSV의 열 인식 결과 */
export function DiagnosisPreview() {
  const rows: [string, string | null][] = [
    ["Date", "날짜"],
    ["Channel", "채널"],
    ["Revenue", "매출"],
    ["Visitors", "방문자"],
    ["메모", null],
  ];
  return (
    <ul className="space-y-1.5">
      {rows.map(([col, field]) => (
        <li key={col} className="flex items-center gap-2 rounded-[8px] bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line">
          {field ? <Check className="h-3.5 w-3.5 text-positive" /> : <Minus className="h-3.5 w-3.5 text-ink-dim" />}
          <span className={field ? "text-ink" : "text-ink-dim"}>{col}</span>
          <span className="text-ink-dim">→</span>
          <span className={field ? "font-semibold text-ink" : "text-ink-dim"}>{field ?? "사용 안 함"}</span>
        </li>
      ))}
    </ul>
  );
}

/** 채널별 매출 변화 미리보기 */
export function ContributionPreview({ items }: { items: Contribution[] }) {
  const max = Math.max(...items.map((i) => Math.abs(i.delta)), 1);
  return (
    <ul className="space-y-2.5">
      {items.slice(0, 4).map((i) => (
        <li key={i.name}>
          <p className="flex items-baseline gap-2 text-[13px]">
            <span className="flex-1 truncate text-ink">{i.name}</span>
            <span className="tabular font-semibold text-ink">{signedKRW(i.delta)}</span>
            <span className={`tabular w-10 text-right text-[12px] ${i.delta < 0 ? "text-negative" : "text-positive"}`}>{signed(i.pct)}</span>
          </p>
          <span className="mt-1 block h-1.5 rounded-full bg-surface">
            <span
              className={`block h-full rounded-full ${i.delta < 0 ? "bg-negative" : "bg-positive"}`}
              style={{ width: `${(Math.abs(i.delta) / max) * 100}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 조사 화면의 시간 흐름 미리보기 */
export function TimelinePreview({ inv }: { inv: Investigation }) {
  return (
    <ol className="space-y-0 border-l-2 border-line pl-4">
      {inv.timeline.marks.map((m) => (
        <li key={m.label} className="relative pb-3 last:pb-0">
          <span
            className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-soft ${
              m.tone === "negative" ? "bg-negative" : m.tone === "positive" ? "bg-positive" : "bg-ink-dim"
            }`}
          />
          <p className="text-[12px] text-ink-dim">{m.label}</p>
          <p className="tabular text-[13px]">
            <b className="font-semibold text-ink">{m.value}</b> <span className="text-ink-soft">· {m.note}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
