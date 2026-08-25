"use client";

import { BarChart3, LineChart, ShoppingCart, TrendingUp, Users } from "lucide-react";
import CountUp from "./CountUp";
import Sparkline from "./Sparkline";
import { KpiResult } from "@/lib/types";
import { formatValue } from "@/lib/format";

const ICONS: Record<string, typeof LineChart> = {
  revenue: LineChart,
  orders: BarChart3,
  customers: Users,
  conversion: TrendingUp,
  aov: ShoppingCart,
};

export default function MetricCard({
  kpi,
  delay = 0,
  showSpark = false,
}: {
  kpi: KpiResult;
  delay?: number;
  showSpark?: boolean;
}) {
  const up = kpi.changePct >= 0;
  const positive = kpi.invert ? !up : up;
  const isPointChange = kpi.key === "conversion"; // 전환율은 %p 변화로 표기
  const Icon = ICONS[kpi.key] ?? LineChart;

  return (
    <div
      className="card card-hover animate-fade-up p-4 md:p-[18px]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12.5px] font-medium text-ink-soft">{kpi.label}</p>
        <Icon className="h-[15px] w-[15px] shrink-0 text-brand-light" strokeWidth={2} />
      </div>
      <p className="mt-1.5 text-[23px] font-bold leading-tight tracking-tight text-ink md:text-[26px]">
        <CountUp value={kpi.value} format={(v) => formatValue(v, kpi.format)} />
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 text-[12px]">
        <span className={`font-bold ${positive ? "text-positive" : "text-negative"}`}>
          {up ? "▲" : "▼"} {Math.abs(kpi.changePct).toFixed(isPointChange ? 2 : 1)}
          {isPointChange ? "%p" : "%"}
        </span>
        <span className="text-ink-dim">전 기간 대비</span>
      </div>
      {showSpark && (
        <div className="mt-2.5">
          <Sparkline data={kpi.spark} color={positive ? "#2563eb" : "#ef4444"} width={120} height={30} />
        </div>
      )}
    </div>
  );
}
