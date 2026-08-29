"use client";

import { ArrowRight, Target } from "lucide-react";
import { Recommendation } from "@/lib/types";

const PRIORITY = {
  high: { label: "우선 실행", cls: "bg-coral-soft text-coral", chip: "bg-coral-soft text-coral" },
  medium: { label: "권장", cls: "bg-amber-soft text-amber", chip: "bg-amber-soft text-amber" },
  low: { label: "검토", cls: "bg-aqua-soft text-aqua", chip: "bg-aqua-soft text-aqua" },
} as const;

/** AI 실행 제안 카드 */
export default function RecommendationCard({ rec, delay = 0 }: { rec: Recommendation; delay?: number }) {
  const p = PRIORITY[rec.priority];
  return (
    <div className="card card-hover animate-fade-up flex h-full flex-col p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-12 w-12 items-center justify-center rounded-[10px] ${p.chip}`}>
          <Target className="h-[27px] w-[27px]" />
        </span>
        <span className={`rounded-md px-2 py-0.5 text-[16px] font-semibold ${p.cls}`}>{p.label}</span>
      </div>
      <p className="mt-3 text-[20px] font-semibold text-ink">{rec.title}</p>
      <p className="mt-1 flex-1 text-[19px] leading-relaxed text-ink-soft">{rec.description}</p>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[16.5px] text-ink-dim">예상 효과</span>
        <span className="flex items-center gap-1 text-[18px] font-bold text-positive">
          {rec.expectedEffect}
          <ArrowRight className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
