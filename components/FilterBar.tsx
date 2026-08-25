"use client";

import { useApp } from "@/lib/store";
import { DemoDataset } from "@/lib/types";
import DateRangePicker from "./DateRangePicker";

/** 모바일 전용 필터 바 — 데스크톱은 상단 툴바(TopBar)가 기간·채널·상품 필터를 제공한다. */
export default function FilterBar({ dataset }: { dataset: DemoDataset }) {
  const { filters, setFilters } = useApp();

  const selectCls =
    "h-9 max-w-[42vw] rounded-[10px] border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink outline-none transition-colors focus:border-brand";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
      <DateRangePicker dataset={dataset} />
      <select
        value={filters.channel}
        onChange={(e) => setFilters({ channel: e.target.value })}
        className={selectCls}
        aria-label="채널 필터"
      >
        <option value="all">전체 채널</option>
        {dataset.channels.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        value={filters.product}
        onChange={(e) => setFilters({ product: e.target.value })}
        className={selectCls}
        aria-label="상품 필터"
      >
        <option value="all">전체 상품</option>
        {dataset.products.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
