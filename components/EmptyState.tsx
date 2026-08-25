"use client";

import Link from "next/link";
import { Database, Sparkles } from "lucide-react";
import { getDemoDatasets } from "@/lib/demo-data";
import { useApp } from "@/lib/store";

/** 분석된 데이터가 없을 때의 빈 상태 — 샘플 분석 CTA 제공 */
export default function EmptyState() {
  const { startAnalysis } = useApp();

  return (
    <div className="card animate-fade-up flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-brand-soft">
        <Database className="h-12 w-12 text-brand" />
      </span>
      <h2 className="mt-5 text-[27px] font-bold text-ink">아직 분석할 데이터가 없습니다</h2>
      <p className="mt-1.5 max-w-sm text-[19.5px] leading-relaxed text-ink-soft">
        샘플 데이터로 먼저 체험해보세요. 데이터를 넣으면 AI가 핵심 변화, 이상징후,
        예측과 다음 행동까지 알려드립니다.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <button
          onClick={() => startAnalysis(getDemoDatasets()[0])}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-[20px] font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <Sparkles className="h-6 w-6" />
          샘플 분석 시작
        </button>
        <Link
          href="/data"
          className="rounded-xl border border-line bg-surface px-5 py-2.5 text-[20px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
        >
          내 데이터 업로드
        </Link>
      </div>
    </div>
  );
}
