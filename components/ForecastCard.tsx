"use client";

import { ForecastSummary } from "@/lib/types";
import { formatKRW, formatNumber } from "@/lib/format";
import CountUp from "./CountUp";
import Sparkline from "./Sparkline";

/** 예측 요약 카드 — 다음 7일 합계와 미니 차트 */
export default function ForecastCard({
  summary,
  delay = 0,
  compact = false,
}: {
  summary: ForecastSummary;
  delay?: number;
  compact?: boolean;
}) {
  const up = summary.changePct >= 0;
  const fmt = (v: number) => (summary.format === "currency" ? formatKRW(v) : formatNumber(v));
  const spark = summary.points
    .map((p) => p.forecast ?? p.value)
    .filter((v): v is number => v != null)
    .slice(-14);

  return (
    <div
      className={`card card-hover animate-fade-up ${compact ? "p-3.5" : "p-4 md:p-[18px]"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[12px] font-medium text-ink-soft">{summary.label}</p>
      <p className="mt-0.5 text-[10.5px] text-ink-dim">다음 7일 · AI Forecast</p>
      <p className={`mt-2 font-bold leading-tight tracking-tight text-ink ${compact ? "text-[17px]" : "text-[22px]"}`}>
        <CountUp value={summary.next7Total} format={fmt} />
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-[11.5px]">
        <span className={`font-bold ${up ? "text-positive" : "text-negative"}`}>
          {up ? "▲" : "▼"} {Math.abs(summary.changePct).toFixed(1)}%
        </span>
        {!compact && <span className="text-ink-dim">최근 7일 대비</span>}
      </div>
      <div className="mt-2.5">
        <Sparkline data={spark} color="#2563eb" width={120} height={compact ? 26 : 32} />
      </div>
    </div>
  );
}
