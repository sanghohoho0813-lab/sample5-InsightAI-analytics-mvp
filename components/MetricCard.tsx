"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import CountUp from "./CountUp";
import Sparkline from "./Sparkline";
import { KpiResult } from "@/lib/types";
import { formatValue } from "@/lib/format";

export default function MetricCard({ kpi, delay = 0 }: { kpi: KpiResult; delay?: number }) {
  const up = kpi.changePct >= 0;
  const positive = kpi.invert ? !up : up;
  const isPointChange = kpi.key === "conversion"; // 전환율은 %p 변화로 표기

  return (
    <div
      className="card card-hover animate-fade-up p-4 md:p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-ink-soft">{kpi.label}</p>
        <Sparkline data={kpi.spark} color={positive ? "#3b82f6" : "#f87171"} width={72} height={26} />
      </div>
      <p className="mt-1 text-[22px] font-bold leading-tight md:text-[24px]">
        <CountUp value={kpi.value} format={(v) => formatValue(v, kpi.format)} />
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12px]">
        <span
          className={`flex items-center gap-0.5 font-semibold ${positive ? "text-positive" : "text-negative"}`}
        >
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {Math.abs(kpi.changePct).toFixed(isPointChange ? 2 : 1)}
          {isPointChange ? "%p" : "%"}
        </span>
        <span className="text-ink-dim">전 기간 대비</span>
      </div>
    </div>
  );
}
