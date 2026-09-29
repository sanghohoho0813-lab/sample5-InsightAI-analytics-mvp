"use client";

import Link from "next/link";
import { getDemoDatasets } from "@/lib/demo-data";
import { useApp } from "@/lib/store";
import { btn } from "@/lib/ui";

/** 분석할 데이터가 없을 때 — 무엇을 하면 되는지 한 가지 행동으로 안내 */
export default function EmptyState({
  title = "아직 분석한 데이터가 없습니다",
  description = "샘플 데이터로 바로 체험하거나, 가지고 있는 CSV·XLSX 파일을 올려보세요.",
}: {
  title?: string;
  description?: string;
}) {
  const { startAnalysis, ready } = useApp();
  if (!ready) return <div className="skeleton h-64 w-full" aria-hidden />;

  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <h2 className="text-title font-bold text-ink">{title}</h2>
      <p className="mt-2 max-w-md text-body text-ink-soft">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={() => startAnalysis(getDemoDatasets()[0])} className={btn.primary}>
          샘플 데이터로 분석
        </button>
        <Link href="/data" className={btn.secondary}>
          내 파일 올리기
        </Link>
      </div>
    </div>
  );
}
