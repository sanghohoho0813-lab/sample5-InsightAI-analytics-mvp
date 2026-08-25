"use client";

import { useState } from "react";
import { ChevronDown, LineChart, Megaphone, Package, Sparkles, Users } from "lucide-react";
import { Insight } from "@/lib/types";

const CATEGORY_ICON: Record<string, typeof Sparkles> = {
  "매출 상승 요인": LineChart,
  "채널 변화": LineChart,
  "고객 행동 변화": Users,
  "마케팅 성과": Megaphone,
  "제품 인사이트": Package,
  "전환 추세": Sparkles,
};

/** AI 인사이트 카드 — 확장 시 상세 설명 */
export default function InsightCard({ insight, delay = 0 }: { insight: Insight; delay?: number }) {
  const [open, setOpen] = useState(false);
  const Icon = CATEGORY_ICON[insight.category] ?? Sparkles;
  const tone =
    insight.impact === "positive" ? "text-positive bg-positive/12"
    : insight.impact === "negative" ? "text-negative bg-negative/12"
    : "text-accent-bright bg-accent/12";

  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className="card card-hover animate-fade-up w-full p-4 text-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-bright">{insight.category}</p>
          <p className="mt-0.5 text-[13.5px] font-semibold leading-snug">{insight.title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{insight.description}</p>
          <div className={`grid transition-all duration-300 ${open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <p className="overflow-hidden rounded-lg text-[12px] leading-relaxed text-ink-dim">{insight.detail}</p>
          </div>
        </div>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-ink-dim transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </div>
    </button>
  );
}
