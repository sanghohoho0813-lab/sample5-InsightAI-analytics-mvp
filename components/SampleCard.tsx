"use client";

import Link from "next/link";
import Sparkline from "./charts/Sparkline";
import { dailySeries, uniqueDates } from "@/lib/analytics-engine";
import { summarize } from "@/lib/briefing";
import { DemoDataset, Filters } from "@/lib/types";
import { btn } from "@/lib/ui";

const F30: Filters = { preset: "30", rangeDays: 30, channel: "all", product: "all" };

export interface SamplePreview {
  days: number;
  spark: number[];
  headline: string;
}

/** 샘플 카드에 보여줄 요약 — 전체 기간 일별 매출 흐름과 최근 30일 결론(실제 계산) */
export function samplePreview(ds: DemoDataset): SamplePreview {
  const dates = uniqueDates(ds.rows);
  return {
    days: dates.length,
    spark: dailySeries(ds.rows, dates).map((p) => p.revenue),
    headline: summarize(ds, F30).headline,
  };
}

/**
 * 샘플 데이터 카드 — 업종 · 데이터 규모 · 90일 매출 흐름 · 이번 기간 결론을 한 장에.
 * preview는 날짜에 따라 달라지므로 화면이 브라우저에서 그려진 뒤 넘겨준다(서버 렌더와 어긋나지 않게).
 */
export default function SampleCard({
  ds,
  preview,
  active = false,
  onAnalyze,
  action = "분석하기",
}: {
  ds: DemoDataset;
  preview: SamplePreview | null;
  active?: boolean;
  onAnalyze: () => void;
  action?: string;
}) {
  return (
    <li className={`card flex flex-col p-5 transition-shadow hover:shadow-raised md:p-6 ${active ? "ring-2 ring-brand/30" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-brand">{ds.category}</span>
        <span className="tabular text-caption text-ink-dim">
          {preview ? `${preview.days}일 · 채널 ${ds.channels.length} · 상품 ${ds.products.length}` : ""}
        </span>
      </div>
      <h3 className="mt-4 flex items-center gap-2 text-card font-bold text-ink">
        {ds.name}
        {active && <span className="rounded-full bg-ink px-2 py-0.5 text-caption font-semibold text-white">보는 중</span>}
      </h3>
      <div className="mt-3 h-12" aria-hidden>
        {preview && <Sparkline values={preview.spark} width={300} height={48} stretch className="h-12 w-full" />}
      </div>
      <p className="mt-3 min-h-[3.2em] text-sub font-medium text-ink">{preview?.headline ?? " "}</p>
      <p className="mt-1 line-clamp-2 text-meta text-ink-soft">{ds.description}</p>
      {active ? (
        <Link href="/dashboard" className={`${btn.secondary} mt-5 w-full`}>
          대시보드 보기
        </Link>
      ) : (
        <button onClick={onAnalyze} className={`${btn.secondary} mt-5 w-full`}>
          {action}
        </button>
      )}
    </li>
  );
}
