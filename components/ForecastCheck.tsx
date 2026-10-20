"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { reliability } from "@/lib/forecast-engine";
import { formatAxisKRW, formatDateShort, formatNumber } from "@/lib/format";
import { COLORS } from "@/lib/palette";
import { ForecastSummary } from "@/lib/types";
import ChartTooltip from "./charts/ChartTooltip";

const WEEKDAY = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" });
const dayLabel = (d: string) => `${formatDateShort(d)} (${WEEKDAY.format(new Date(`${d}T00:00:00Z`))})`;

const LEVEL = {
  high: { label: "믿을 만함", cls: "bg-positive-soft text-positive", note: "계획을 세울 때 숫자 그대로 써도 좋은 수준입니다." },
  medium: { label: "참고용", cls: "bg-warning-soft text-warning", note: "대략적인 크기와 방향으로 보세요." },
  low: {
    label: "크게 빗나감",
    cls: "bg-negative-soft text-negative",
    note: "최근 급변·프로모션처럼 추세로는 설명되지 않는 움직임이 커서, 숫자보다 방향만 참고하세요.",
  },
} as const;

/**
 * 예측 화면 아래쪽 — ① 이 예측을 얼마나 믿을 수 있나(지난 7일을 가리고 해 본 검증) ② 일별 예측 표.
 * 숫자 하나만 던지지 않고 '얼마나 맞아 왔는지'와 '날짜별로 얼마인지'를 함께 보여준다.
 */
export default function ForecastCheck({ summary, fmt }: { summary: ForecastSummary; fmt: (v: number) => string }) {
  const b = summary.backtest;
  const future = summary.points.filter((p) => p.value == null && p.forecast != null);
  const axisFmt = (v: number) => (summary.format === "currency" ? formatAxisKRW(v) : formatNumber(v));
  const level = b ? LEVEL[reliability(b)] : null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
      <section className="card p-5 md:p-6" aria-labelledby="fc-check">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="fc-check" className="text-card font-bold text-ink">
            이 예측을 얼마나 믿을 수 있나
          </h2>
          {level && <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${level.cls}`}>{level.label}</span>}
        </div>
        {b && level ? (
          <>
            <p className="mt-3 text-body text-ink">
              지난 7일을 가리고 같은 방법으로 예측해 보니, 7일 합계가 실제와{" "}
              <b className="tabular font-semibold">{b.totalErrorPct.toFixed(1)}%</b> 달랐습니다. 7일 중{" "}
              <b className="tabular font-semibold">{b.withinRange}일</b>이 예상 범위 안에 들었습니다.
            </p>
            <p className="mt-1 text-sub text-ink-soft">{level.note}</p>
            <div className="mt-4 h-[180px] min-w-0" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={b.days} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={formatDateShort} axisLine={false} tickLine={false} fontSize={12} />
                  <YAxis tickFormatter={axisFmt} axisLine={false} tickLine={false} width={56} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: COLORS.brandSoft }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <ChartTooltip
                          label={dayLabel(String(payload[0].payload.date))}
                          rows={[
                            { name: "실제", value: fmt(Number(payload[0].payload.actual)), color: COLORS.brand },
                            { name: "그때 예측", value: fmt(Number(payload[0].payload.forecast)), color: COLORS.accent },
                          ]}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="actual" fill="#c9dbf7" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={500} />
                  <Line dataKey="forecast" stroke={COLORS.accent} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3, fill: COLORS.accent }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[2px] bg-[#c9dbf7]" aria-hidden /> 실제
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed border-accent" aria-hidden /> 그때 했을 예측
              </span>
              <span className="text-ink-dim">하루 평균 오차 {b.dailyErrorPct.toFixed(1)}%</span>
            </p>
          </>
        ) : (
          <p className="mt-3 text-sub text-ink-soft">
            검증하려면 21일 이상의 데이터가 필요합니다(예측에 쓰는 14일 + 맞혀 볼 7일).
          </p>
        )}
      </section>

      <section className="card overflow-hidden" aria-labelledby="fc-days">
        <div className="px-5 pt-5 md:px-6 md:pt-6">
          <h2 id="fc-days" className="text-card font-bold text-ink">
            일별 예측
          </h2>
          {summary.basis && (
            <p className="mt-1 text-meta text-ink-soft">
              최근 7일 하루 평균 <b className="tabular font-semibold text-ink">{fmt(summary.basis.recentAvg)}</b>에서 하루{" "}
              <b className="tabular font-semibold text-ink">
                {summary.basis.dailyGrowthPct >= 0 ? "+" : "−"}
                {Math.abs(summary.basis.dailyGrowthPct).toFixed(2)}%
              </b>
              씩 이어 간다고 보고 계산했습니다.
            </p>
          )}
        </div>
        <table className="mt-3 w-full text-sub">
          <caption className="sr-only">다음 7일 날짜별 예측과 예상 범위</caption>
          <thead>
            <tr className="border-b border-line text-caption text-ink-dim">
              <th scope="col" className="px-5 py-2 text-left font-semibold md:px-6">
                날짜
              </th>
              <th scope="col" className="py-2 pr-5 text-right font-semibold sm:pr-0">
                예측<span className="sm:hidden"> · 예상 범위</span>
              </th>
              <th scope="col" className="hidden px-5 py-2 text-right font-semibold sm:table-cell md:px-6">
                예상 범위
              </th>
            </tr>
          </thead>
          <tbody>
            {future.map((p) => (
              <tr key={p.date} className="border-b border-line/70 last:border-0">
                <td className="tabular whitespace-nowrap px-5 py-2.5 text-ink md:px-6">{dayLabel(p.date)}</td>
                <td className="tabular py-2.5 pr-5 text-right font-semibold text-ink sm:pr-0">
                  {fmt(p.forecast!)}
                  {/* 좁은 화면에서는 범위를 예측값 아래에 */}
                  <span className="block whitespace-nowrap text-caption font-normal text-ink-soft sm:hidden">
                    {fmt(p.lower!)} ~ {fmt(p.upper!)}
                  </span>
                </td>
                <td className="tabular hidden whitespace-nowrap px-5 py-2.5 text-right text-meta text-ink-soft sm:table-cell md:px-6">
                  {fmt(p.lower!)} ~ {fmt(p.upper!)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
