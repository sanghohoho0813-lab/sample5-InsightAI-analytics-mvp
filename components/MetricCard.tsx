"use client";

import { BarChart3, LineChart, ShoppingCart, TrendingUp, Users } from "lucide-react";
import CountUp from "./CountUp";
import Sparkline from "./Sparkline";
import { KpiResult } from "@/lib/types";
import { formatValue } from "@/lib/format";
import { HUES, HueName } from "@/lib/palette";

const META: Record<string, { icon: typeof LineChart; hue: HueName }> = {
  revenue: { icon: LineChart, hue: "blue" },
  orders: { icon: BarChart3, hue: "violet" },
  customers: { icon: Users, hue: "cyan" },
  conversion: { icon: TrendingUp, hue: "mint" },
  aov: { icon: ShoppingCart, hue: "amber" },
};

export default function MetricCard({
  kpi,
  delay = 0,
  showSpark = false,
  selected = false,
  onSelect,
}: {
  kpi: KpiResult;
  delay?: number;
  showSpark?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const up = kpi.changePct >= 0;
  const positive = kpi.invert ? !up : up;
  const isPointChange = kpi.key === "conversion"; // 전환율은 %p 변화로 표기
  const meta = META[kpi.key] ?? { icon: LineChart, hue: "blue" as HueName };
  const Icon = meta.icon;
  const c = HUES[meta.hue];

  const Tag = onSelect ? "button" : "div";

  return (
    <Tag
      onClick={onSelect}
      aria-pressed={onSelect ? selected : undefined}
      className={`card card-hover animate-fade-up w-full p-5 text-left md:p-6 ${selected ? "ring-2" : ""}`}
      style={selected ? { animationDelay: `${delay}ms`, borderColor: c.base, boxShadow: `0 0 0 3px ${c.soft}` } : { animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="mt-1 text-[19px] font-medium text-ink-soft">{kpi.label}</p>
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: c.soft, color: c.base }}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
        </span>
      </div>
      <p className="mt-1.5 text-[33px] font-bold leading-tight tracking-tight text-ink">
        <CountUp value={kpi.value} format={(v) => formatValue(v, kpi.format)} />
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 text-[18px]">
        <span className={`font-bold ${positive ? "text-positive" : "text-negative"}`}>
          {up ? "▲" : "▼"} {Math.abs(kpi.changePct).toFixed(isPointChange ? 2 : 1)}
          {isPointChange ? "%p" : "%"}
        </span>
        <span className="text-ink-dim">전 기간 대비</span>
      </div>
      {showSpark && (
        <div className="mt-2.5">
          <Sparkline data={kpi.spark} color={positive ? c.base : "#dd6350"} width={120} height={30} />
        </div>
      )}
      {onSelect && (
        <span className={`mt-2.5 block text-[15px] font-semibold transition-colors ${selected ? "text-brand" : "text-ink-dim"}`}>
          {selected ? "차트에 표시 중" : "차트에서 보기"}
        </span>
      )}
    </Tag>
  );
}
