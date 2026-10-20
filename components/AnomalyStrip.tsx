"use client";

import { useRouter } from "next/navigation";
import { Anomaly } from "@/lib/types";
import { investigationHref } from "@/lib/drill";
import { formatKRW, formatMonthDay } from "@/lib/format";
import { COLORS } from "@/lib/palette";

/** 변화의 색 — 떨어진 날은 등급(위험 빨강 · 주의 주황), 오른 날은 초록. 차트 위 점과 같은 규칙. */
export const anomalyTone = (a: Anomaly) =>
  a.direction === "up" ? COLORS.positive : a.severity === "critical" ? COLORS.negative : COLORS.caution;

const RANK = { critical: 3, warning: 2, info: 1 } as const;
const short = (d: string) => d.slice(5).replace("-", ".");

/**
 * 기간 한눈에 — 범위 안의 하루하루를 일별 매출 막대로 그리고, 평소와 달랐던 날을 색으로 칠한다.
 * '언제 몰려 있었나'를 목록보다 먼저 보여 주고, 색칠된 막대를 누르면 그 변화의 조사 화면으로 간다.
 * 막대는 보조 수단이라 화면 낭독기에는 요약 문장만 읽히고, 같은 조사는 아래 목록으로 열 수 있다.
 */
export default function AnomalyStrip({ days, anomalies }: { days: { date: string; revenue: number }[]; anomalies: Anomaly[] }) {
  const router = useRouter();
  if (days.length < 2) return null;

  const byDate = new Map<string, Anomaly>();
  for (const a of anomalies) {
    for (const d of days) {
      if (d.date < a.date || d.date > a.endDate) continue;
      const prev = byDate.get(d.date);
      if (!prev || RANK[a.severity] > RANK[prev.severity]) byDate.set(d.date, a);
    }
  }
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const hit = days.filter((d) => byDate.has(d.date)).length;
  const tones = [
    { on: anomalies.some((a) => a.direction === "down" && a.severity === "critical"), color: COLORS.negative, label: "위험" },
    { on: anomalies.some((a) => a.direction === "down" && a.severity === "warning"), color: COLORS.caution, label: "주의" },
    { on: anomalies.some((a) => a.direction === "up"), color: COLORS.positive, label: "평소보다 많았던 날" },
  ].filter((t) => t.on);
  const mid = days[Math.floor((days.length - 1) / 2)].date;

  return (
    <figure className="border-b border-line px-5 pb-4 pt-5 md:px-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-sub font-semibold text-ink">기간 한눈에</span>
        <span className="text-meta text-ink-dim">
          {hit > 0 ? (
            <>
              <b className="tabular font-semibold text-ink">{days.length}일</b> 중{" "}
              <b className="tabular font-semibold text-ink">{hit}일</b>이 평소와 달랐습니다
            </>
          ) : (
            `${days.length}일 동안 평소와 크게 다른 날이 없었습니다`
          )}
          <span className="hidden sm:inline"> · 막대는 일별 매출</span>
        </span>
      </figcaption>
      <div className={`mt-3 flex h-14 items-end ${days.length > 45 ? "gap-px" : "gap-[3px]"}`} aria-hidden>
        {days.map((d) => {
          const a = byDate.get(d.date);
          return (
            <div
              key={d.date}
              title={`${formatMonthDay(d.date)} · 매출 ${formatKRW(d.revenue)}${a ? ` · ${a.title} — 눌러서 조사` : ""}`}
              onClick={a ? () => router.push(investigationHref(a.id)) : undefined}
              className={`min-w-0 flex-1 rounded-t-[2px] transition-opacity ${a ? "cursor-pointer hover:opacity-75" : ""}`}
              style={{ height: `${Math.max(10, (d.revenue / max) * 100)}%`, background: a ? anomalyTone(a) : "#dedad2" }}
            />
          );
        })}
      </div>
      <div className="tabular mt-1.5 flex justify-between text-caption text-ink-dim" aria-hidden>
        <span>{short(days[0].date)}</span>
        <span>{short(mid)}</span>
        <span>{short(days[days.length - 1].date)}</span>
      </div>
      {tones.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-soft">
          {tones.map((t) => (
            <span key={t.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: t.color }} aria-hidden />
              {t.label}
            </span>
          ))}
          <span className="hidden text-ink-dim sm:inline">색칠된 막대를 누르면 조사 화면으로 갑니다</span>
        </p>
      )}
    </figure>
  );
}
