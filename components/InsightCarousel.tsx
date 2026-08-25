"use client";

import { useRef, useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { Insight } from "@/lib/types";

/** 모바일 'AI 핵심 인사이트' 캐러셀 — 스크롤 스냅 + 인디케이터 */
export default function InsightCarousel({ insights }: { insights: Insight[] }) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  if (insights.length === 0) return null;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="snap-row -mx-4 flex overflow-x-auto px-4"
      >
        {insights.map((ins) => (
          <div key={ins.id} className="snap-item w-full shrink-0 pr-3 last:pr-0">
            <div className="rounded-[14px] border border-brand/15 bg-gradient-to-br from-brand-soft to-[#f5f9ff] p-4">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                AI 핵심 인사이트
              </p>
              <div className="mt-2.5 flex items-start gap-3">
                <p className="flex-1 text-[13.5px] font-semibold leading-relaxed text-ink">
                  {ins.description}
                </p>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface/80">
                  <TrendingUp className="h-5 w-5 text-brand" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {insights.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {insights.map((ins, i) => (
            <span
              key={ins.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-brand" : "w-1.5 bg-line-strong"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
