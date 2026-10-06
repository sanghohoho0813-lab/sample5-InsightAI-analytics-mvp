"use client";

import { RotateCcw } from "lucide-react";
import { useApp } from "@/lib/store";
import { canSplit } from "@/lib/dataset-meta";
import { DemoDataset } from "@/lib/types";
import DateRangePicker from "./DateRangePicker";
import Select from "./Select";
import ScopeSheet from "./ScopeSheet";

/**
 * 분석 범위(기간·채널·상품) — 데이터를 보는 화면에서만, 본문 상단 한 줄로 둔다.
 * 값이 하나뿐인 차원(예: 채널 컬럼이 없는 업로드 파일)은 숨긴다. 기본값과 다르면 '초기화'가 나타난다.
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
  const showChannel = canSplit(dataset, "channel");
  const showProduct = canSplit(dataset, "product");
  const count = Number(showPeriod) + Number(showChannel) + Number(showProduct);
  const changed =
    (showChannel && filters.channel !== "all") ||
    (showProduct && filters.product !== "all") ||
    (showPeriod && filters.preset !== settings.defaultPreset);

  if (count === 0) return null;

  return (
    <>
    {/* 모바일: 한 줄 요약 + 바텀시트 */}
    <ScopeSheet dataset={dataset} showPeriod={showPeriod} />
    <div className={`mb-6 hidden flex-wrap items-center gap-2 sm:flex ${className}`} role="group" aria-label="분석 범위">
      <div className="flex flex-wrap gap-2">
        {showPeriod && <DateRangePicker dataset={dataset} />}
        {showChannel && (
          <Select
            label="채널"
            value={filters.channel}
            onChange={(v) => setFilters({ channel: v })}
            active={filters.channel !== "all"}
            className="sm:w-[176px]"
            options={[{ value: "all", label: "전체 채널" }, ...dataset.channels.map((c) => ({ value: c, label: c }))]}
          />
        )}
        {showProduct && (
          <Select
            label="상품"
            value={filters.product}
            onChange={(v) => setFilters({ product: v })}
            active={filters.product !== "all"}
            className="sm:w-[176px]"
            options={[{ value: "all", label: "전체 상품" }, ...dataset.products.map((p) => ({ value: p, label: p }))]}
          />
        )}
      </div>
      {changed && (
        <button
          onClick={resetFilters}
          className="inline-flex min-h-11 items-center gap-1 px-2 text-meta font-semibold text-ink-soft transition-colors hover:text-ink"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> 초기화
        </button>
      )}
    </div>
    </>
  );
}
