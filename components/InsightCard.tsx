"use client";

import { useState } from "react";
import { ChevronDown, LineChart, Megaphone, Package, Sparkles, Users } from "lucide-react";
import { Insight } from "@/lib/types";

const CATEGORY: Record<string, { icon: typeof Sparkles; tone: string }> = {
  "매출 상승 요인": { icon: LineChart, tone: "bg-brand-soft text-brand" },
  "채널 변화": { icon: LineChart, tone: "bg-warning-soft text-warning" },
  "고객 행동 변화": { icon: Users, tone: "bg-positive-soft text-positive" },
  "마케팅 성과": { icon: Megaphone, tone: "bg-brand-soft text-brand" },
  "제품 인사이트": { icon: Package, tone: "bg-[#f5f1ff] text-iris" },
  "전환 추세": { icon: Sparkles, tone: "bg-[#eefcfa] text-aqua" },
};

/** AI 인사이트 카드 — 확장 시 상세 설명 */
export default function InsightCard({ insight, delay = 0 }: { insight: Insight; delay?: number }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY[insight.category] ?? { icon: Sparkles, tone: "bg-brand-soft text-brand" };
  const Icon = meta.icon;

  return (
    <button
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      className="card card-hover animate-fade-up w-full p-5 text-left"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] ${meta.tone}`}>
          <Icon className="h-[27px] w-[27px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold text-ink-dim">{insight.category}</p>
          <p className="mt-0.5 text-[20px] font-semibold leading-snug text-ink">{insight.title}</p>
          <p className="mt-1 text-[19px] leading-relaxed text-ink-soft">{insight.description}</p>
          <div className={`grid transition-all duration-300 ${open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <p className="overflow-hidden rounded-lg text-[18px] leading-relaxed text-ink-dim">{insight.detail}</p>
          </div>
        </div>
        <ChevronDown className={`mt-1 h-6 w-6 shrink-0 text-ink-dim transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </div>
    </button>
  );
}
