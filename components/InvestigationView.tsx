"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import InvestigationChart from "./charts/InvestigationChart";
import { Panel } from "./Panel";
import { whenText } from "./AnomalyList";
import { useApp } from "@/lib/store";
import { investigationHref, useDrill } from "@/lib/drill";
import { investigate, Investigation } from "@/lib/investigate";
import { formatMonthDay, josa } from "@/lib/format";
import { ALL_NAV } from "@/lib/nav";
import { Anomaly } from "@/lib/types";
import { SEVERITY_META, btn } from "@/lib/ui";

const pctText = (v: number) => {
  const abs = Math.abs(v).toFixed(0);
  return abs === "0" ? "0%" : `${v > 0 ? "+" : "−"}${abs}%`;
};

function Step({ n, title, children, className = "" }: { n: number; title: string; children: React.ReactNode; className?: string }) {
  const id = `step-${n}`;
  return (
    <Panel className={`p-5 md:p-6 ${className}`} aria-labelledby={id}>
      <h2 id={id} className="flex items-center gap-2.5 text-card font-bold text-ink">
        <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-caption font-bold text-brand">
          {n}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Panel>
  );
}

function Status({ inv }: { inv: Investigation }) {
  const t = inv.timeline;
  const [label, cls] = t.ongoing
    ? ["진행 중", "bg-negative-soft text-negative"]
    : t.recoveredOn
      ? [`${formatMonthDay(t.recoveredOn)} 회복`, "bg-positive-soft text-positive"]
      : ["완전히 회복되지 않음", "bg-warning-soft text-warning"];
  return <span className={`rounded-full px-2.5 py-1 text-caption font-semibold ${cls}`}>{label}</span>;
}

/** 이상치 조사 — 무슨 변화인가 → 언제부터 → 어디서 → 근거 → 지금 할 일 */
export default function InvestigationView({ anomaly, queue, from }: { anomaly: Anomaly; queue: Anomaly[]; from: string | null }) {
  const { dataset, filters, markRead, readIds } = useApp();
  const { toMoment } = useDrill();
  const router = useRouter();
  const inv = useMemo(() => (dataset ? investigate(dataset, anomaly, filters) : null), [dataset, anomaly, filters]);
  const s = SEVERITY_META[anomaly.severity];
  const back = from ? (ALL_NAV.find((n) => n.href === from)?.label ?? "이전 화면") : "이상 감지 목록";

  // 넘겨보기 — 목록과 같은 순서로 이전·다음 변화로 간다(받은편지함처럼 차례로 확인).
  const index = Math.max(0, queue.findIndex((a) => a.id === anomaly.id));
  const prev = index > 0 ? queue[index - 1] : null;
  const next = index < queue.length - 1 ? queue[index + 1] : null;
  const unreadLeft = queue.filter((a) => a.severity !== "info" && a.id !== anomaly.id && !readIds.includes(a.id)).length;
  const go = useCallback(
    (a: Anomaly) => {
      router.replace(investigationHref(a.id, from ?? undefined));
      window.scrollTo({ top: 0 });
    },
    [router, from]
  );

  // 조사 화면을 열었으면 확인한 것으로 본다.
  useEffect(() => {
    if (anomaly.severity !== "info") markRead([anomaly.id]);
  }, [anomaly.id, anomaly.severity, markRead]);

  // ← → 키로 넘기기(입력 중이 아닐 때)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft" && prev) go(prev);
      if (e.key === "ArrowRight" && next) go(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, go]);

  // 휴대폰에서는 옆으로 밀어 넘긴다 — 차트·가로로 넘치는 표 위에서 민 것은 무시한다.
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const el = e.target as HTMLElement;
    touch.current = el.closest(".recharts-wrapper, .overflow-x-auto, input, select, textarea")
      ? null
      : { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s0 = touch.current;
    touch.current = null;
    if (!s0) return;
    const dx = e.changedTouches[0].clientX - s0.x;
    const dy = e.changedTouches[0].clientY - s0.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || Date.now() - s0.t > 700) return;
    if (dx < 0 && next) go(next);
    if (dx > 0 && prev) go(prev);
  };

  const backLink = (
    <Link href={from ?? "/anomalies"} className="inline-flex min-h-11 min-w-0 items-center gap-1 text-sub font-semibold text-ink-soft hover:text-ink">
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden /> <span className="truncate">{from ? `${josa(back, "으로")} 돌아가기` : back}</span>
    </Link>
  );

  const stepper = "flex h-9 w-9 items-center justify-center rounded-control border border-line-strong bg-surface text-ink-soft shadow-subtle transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";
  const triageBar = (
    <nav
      aria-label="변화 넘겨보기"
      className="sticky top-14 z-20 -mx-4 mb-5 flex items-center gap-2 border-b border-line/70 bg-canvas/90 px-4 py-1.5 backdrop-blur-md md:-mx-8 md:px-8 lg:top-[60px]"
    >
      {backLink}
      {queue.length > 1 && (
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className="tabular text-meta text-ink-dim" aria-live="polite">
            <b className="font-semibold text-ink">{index + 1}</b> / {queue.length}
            {unreadLeft > 0 && <span className="hidden sm:inline"> · 미확인 {unreadLeft}건</span>}
          </span>
          <button onClick={() => prev && go(prev)} disabled={!prev} className={stepper} aria-label="이전 변화" title="이전 변화 (←)">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button onClick={() => next && go(next)} disabled={!next} className={stepper} aria-label="다음 변화" title="다음 변화 (→)">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </nav>
  );

  if (!inv) {
    return (
      <>
        {triageBar}
        <h1 className="text-page font-bold tracking-tight text-ink">{anomaly.title}</h1>
        <p className="mt-2 text-body text-ink-soft">{anomaly.description}</p>
        <p className="mt-4 text-sub text-ink-dim">이 변화 앞의 데이터가 7일보다 짧아 자세한 조사는 계산하지 않았습니다.</p>
      </>
    );
  }

  return (
    <>
      {triageBar}
      <div key={anomaly.id} className="animate-fade-in" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-dim">
            <span className={`font-semibold ${s.text}`}>{s.label}</span>
            <span aria-hidden>·</span>
            <span>{inv.scope === "전체" ? "전체 합계" : inv.scope}</span>
            <span aria-hidden>·</span>
            <span className="tabular">{whenText(anomaly)}</span>
          </p>
          <h1 className="mt-1 text-page font-bold tracking-tight text-ink">{anomaly.title}</h1>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button onClick={() => toMoment(anomaly.date, anomaly.channel, anomaly.metricKey, anomaly.title)} className={btn.secondary}>
            그날 전후 자세히 분석
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Step n={1} title="무슨 변화인가" className="lg:col-span-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-center">
            <div>
              <p className="text-lead font-medium text-ink">{inv.what}</p>
              <p className="mt-3 text-meta text-ink-dim">{inv.method}</p>
            </div>
            <InvestigationChart
              series={inv.series}
              metricKey={inv.metricKey}
              label={inv.metricLabel}
              start={inv.timeline.start}
              end={inv.timeline.end}
              down={anomaly.direction === "down"}
            />
          </div>
        </Step>

        <Step n={2} title="언제 시작됐고, 지금은?" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Status inv={inv} />
            <span className="tabular text-meta text-ink-dim">
              시작 {formatMonthDay(inv.timeline.start)} · {inv.timeline.days}일간
            </span>
          </div>
          <p className="mt-3 text-body text-ink">{inv.timeline.text}</p>
          <ol className="mt-4 space-y-0 border-l-2 border-line pl-4">
            {inv.timeline.marks.map((m) => (
              <li key={m.label} className="relative pb-3 last:pb-0">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${
                    m.tone === "negative" ? "bg-negative" : m.tone === "positive" ? "bg-positive" : "bg-ink-dim"
                  }`}
                  aria-hidden
                />
                <p className="text-meta text-ink-dim">{m.label}</p>
                <p className="tabular text-sub">
                  <b className="font-semibold text-ink">{m.value}</b> <span className="text-ink-soft">· {m.note}</span>
                </p>
              </li>
            ))}
          </ol>
        </Step>

        <Step n={3} title="어디서 생겼나" className="lg:col-span-3">
          {inv.breakdowns.length === 0 ? (
            <p className="text-sub text-ink-soft">채널·상품 구분이 없는 데이터라 더 나눠 볼 수 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {inv.breakdowns.map((b) => {
                const max = Math.max(...b.items.map((i) => Math.abs(i.deltaPct)), 1);
                return (
                  <div key={b.dim}>
                    <h3 className="text-sub font-semibold text-ink">{b.title} — 평소 대비</h3>
                    <p className="mt-1 text-sub text-ink-soft">{b.summary}</p>
                    <ul className="mt-3 space-y-2">
                      {b.items.slice(0, 6).map((i) => (
                        <li key={i.name} className="flex items-center gap-3 text-sub">
                          <span className="w-24 shrink-0 truncate text-ink sm:w-28">{i.name}</span>
                          <span className="relative h-2 min-w-0 flex-1 rounded-full bg-surface-soft" aria-hidden>
                            <span
                              className={`absolute inset-y-0 left-0 rounded-full ${i.delta < 0 ? "bg-negative" : "bg-positive"}`}
                              style={{ width: `${(Math.abs(i.deltaPct) / max) * 100}%` }}
                            />
                          </span>
                          <span className="tabular hidden w-24 shrink-0 text-right text-meta text-ink-soft sm:block">
                            {b.format(i.value)}
                          </span>
                          <span className={`tabular w-12 shrink-0 text-right font-semibold ${i.delta < 0 ? "text-negative" : "text-positive"}`}>
                            {pctText(i.deltaPct)}
                          </span>
                          {b.additive && (
                            <span className="tabular hidden w-14 shrink-0 text-right text-meta text-ink-dim sm:block">
                              몫 {Math.round(i.share ?? 0)}%
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Step>

        <Step n={4} title="확인할 수 있는 근거" className="lg:col-span-2">
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-sub">
              <caption className="sr-only">{formatMonthDay(inv.peakDate)} 지표별 값과 평소 수준</caption>
              <thead>
                <tr className="border-b border-line text-left text-caption text-ink-dim">
                  <th className="px-1 py-2 font-semibold">{formatMonthDay(inv.peakDate)}</th>
                  <th className="px-1 py-2 text-right font-semibold">그날</th>
                  <th className="px-1 py-2 text-right font-semibold">평소</th>
                  <th className="px-1 py-2 text-right font-semibold">차이</th>
                </tr>
              </thead>
              <tbody>
                {inv.evidence.map((e) => (
                  <tr key={e.key} className="border-b border-line/70 align-top last:border-0">
                    <td className="px-1 py-2.5">
                      <span className={e.flagged ? "font-semibold text-ink" : "text-ink-soft"}>{e.label}</span>
                      {e.note && <span className="mt-0.5 block text-caption text-ink-dim">{e.note}</span>}
                    </td>
                    <td className="tabular px-1 py-2.5 text-right font-semibold text-ink">{e.value}</td>
                    <td className="tabular px-1 py-2.5 text-right text-ink-soft">
                      {e.expected}
                      {e.weekly && <span className="block text-caption text-ink-dim">같은 요일 {e.weekly}</span>}
                    </td>
                    <td
                      className={`tabular px-1 py-2.5 text-right font-semibold ${
                        Math.abs(e.deltaPct) < 10 ? "text-ink-soft" : e.deltaPct < 0 ? "text-negative" : "text-positive"
                      }`}
                    >
                      {pctText(e.deltaPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-caption text-ink-dim">굵은 지표가 이상치로 잡힌 지표입니다. 평소 = 직전 7일 중앙값.</p>
        </Step>

        <Step n={5} title="지금 할 일" className="lg:col-span-3">
          <p className="text-caption font-semibold text-ink-dim">가능성 높은 원인 · 데이터 패턴으로 본 추정</p>
          <p className="mt-1 text-body font-semibold text-ink">{inv.diagnosis.cause}</p>
          <ol className="mt-4 space-y-3">
            {inv.diagnosis.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-body text-ink">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <span>
                  <span className="sr-only">{i + 1}. </span>
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-control bg-surface-soft px-4 py-3 text-meta text-ink-soft">
            실제 원인은 그날의 운영 기록(광고 집행, 배포, 재고, 매장 운영)으로 확인하세요. 대시보드의 &lsquo;보고서로 저장&rsquo;으로 이 기간의 결론을 남겨 두면
            다음 달과 비교할 수 있습니다.
          </p>
        </Step>
      </div>

      {/* 다음 변화로 — 확인을 마치면 목록으로 돌아가지 않고 바로 이어서 본다 */}
      <div className="mt-6 flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-subtle sm:flex-row sm:items-center sm:justify-between md:px-6">
        {next ? (
          <>
            <div className="min-w-0">
              <p className="eyebrow">
                다음 변화 · {index + 2} / {queue.length}
                <span className="font-medium normal-case text-ink-dim sm:hidden"> · 옆으로 밀어도 넘어갑니다</span>
              </p>
              <p className="mt-0.5 truncate text-body font-semibold text-ink">
                <span className={SEVERITY_META[next.severity].text}>[{SEVERITY_META[next.severity].label}]</span> {next.title}
              </p>
              <p className="text-meta text-ink-dim">{whenText(next)}</p>
            </div>
            <button onClick={() => go(next)} className={`${btn.primary} shrink-0`}>
              확인했어요 · 다음 보기 <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0">
              <p className="eyebrow">마지막 변화</p>
              <p className="mt-0.5 text-body font-semibold text-ink">
                {queue.length > 1 ? `이 범위의 변화 ${queue.length}건을 모두 봤습니다.` : "이 범위에서 감지된 변화는 이것 하나입니다."}
              </p>
            </div>
            <Link href={from ?? "/anomalies"} className={`${btn.secondary} shrink-0`}>
              확인 완료 · {josa(back, "으로")}
            </Link>
          </>
        )}
      </div>
      </div>
    </>
  );
}
