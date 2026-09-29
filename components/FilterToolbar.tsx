"use client";

import { X } from "lucide-react";
import { useApp } from "@/lib/store";
import { DemoDataset } from "@/lib/types";
import { field } from "@/lib/ui";
import DateRangePicker from "./DateRangePicker";

/**
 * 분석 범위(기간·채널·상품) — 데이터를 보는 화면에서만, 본문 상단 한 줄로 둔다.
 * 기본값과 다르면 '초기화'가 나타난다.
 */
export default function FilterToolbar({
  dataset,
  className = "",
  showPeriod = true,
}: {
  dataset: DemoDataset;
  className?: string;
  /** 예측처럼 기간과 무관한 화면에서는 기간 선택을 숨긴다 */
  showPeriod?: boolean;
}) {
  const { filters, settings, setFilters, resetFilters } = useApp();
  const changed =
    filters.channel !== "all" || filters.product !== "all" || (showPeriod && filters.preset !== settings.defaultPreset);

  return (
    <div className={`mb-6 grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap ${className}`} role="group" aria-label="분석 범위">
      {showPeriod && (
        <div className="col-span-2 sm:col-span-1">
          <DateRangePicker dataset={dataset} />
        </div>
      )}
      <select
        value={filters.channel}
        onChange={(e) => setFilters({ channel: e.target.value })}
        aria-label="채널"
        className={`${field} w-full sm:w-auto sm:max-w-[200px] ${filters.channel !== "all" ? "border-brand text-brand" : ""}`}
      >
        <option value="all">전체 채널</option>
        {dataset.channels.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={filters.product}
        onChange={(e) => setFilters({ product: e.target.value })}
        aria-label="상품"
        className={`${field} w-full sm:w-auto sm:max-w-[200px] ${filters.product !== "all" ? "border-brand text-brand" : ""}`}
      >
        <option value="all">전체 상품</option>
        {dataset.products.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      {changed && (
        <button
          onClick={resetFilters}
          className="col-span-2 inline-flex min-h-11 items-center gap-1 justify-self-start px-2 text-meta font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden /> 초기화
        </button>
      )}
    </div>
  );
}
