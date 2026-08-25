"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ForecastSummary } from "@/lib/types";
import { formatKRW, formatNumber } from "@/lib/format";
import CountUp from "./CountUp";
import Sparkline from "./Sparkline";

/** 예측 요약 카드 — 다음 7일 합계와 미니 차트 */
export default function ForecastCard({ summary, delay = 0 }: { summary: ForecastSummary; delay?: number }) {
  const up = summary.changePct >= 0;
  const fmt = (v: number) => (summary.format === "currency" ? formatKRW(v) : formatNumber(v));
  const spark = summary.points
    .map((p) => p.forecast ?? p.value)
    .filter((v): v is number => v != null);

  return (
    <div className="card card-hover animate-fade-up p-4 md:p-5" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[12px] font-medium text-ink-soft">{summary.label}</p>
      <p className="mt-0.5 text-[11px] text-ink-dim">다음 7일 · AI Forecast</p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-[22px] font-bold leading-tight">
          <CountUp value={summary.next7Total} format={fmt} />
        </p>
        <Sparkline data={spark.slice(-14)} color="#22d3ee" width={72} height={26} />
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12px]">
        <span className={`flex items-center gap-0.5 font-semibold ${up ? "text-positive" : "text-negative"}`}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(summary.changePct).toFixed(1)}%
        </span>
        <span className="text-ink-dim">최근 7일 대비</span>
      </div>
    </div>
  );
}
