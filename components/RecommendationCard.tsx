"use client";

import { ArrowRight, Target } from "lucide-react";
import { Recommendation } from "@/lib/types";

const PRIORITY = {
  high: { label: "우선 실행", cls: "bg-negative/12 text-negative" },
  medium: { label: "권장", cls: "bg-warning/12 text-warning" },
  low: { label: "검토", cls: "bg-accent/12 text-accent-bright" },
} as const;

/** AI 실행 제안 카드 */
export default function RecommendationCard({ rec, delay = 0 }: { rec: Recommendation; delay?: number }) {
  const p = PRIORITY[rec.priority];
  return (
    <div className="card card-hover animate-fade-up flex h-full flex-col p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent/25 to-cyan-accent/20">
          <Target className="h-[18px] w-[18px] text-accent-bright" />
        </span>
        <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold ${p.cls}`}>{p.label}</span>
      </div>
      <p className="mt-3 text-[13.5px] font-semibold">{rec.title}</p>
      <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-ink-soft">{rec.description}</p>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="text-[11px] text-ink-dim">예상 효과</span>
        <span className="flex items-center gap-1 text-[12px] font-bold text-positive">
          {rec.expectedEffect}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
