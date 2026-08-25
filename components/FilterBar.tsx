"use client";

import { useApp } from "@/lib/store";
import { DemoDataset } from "@/lib/types";

const RANGES: { value: 7 | 30 | 90; label: string }[] = [
  { value: 7, label: "7일" },
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
];

/** 기간 · 채널 · 상품 필터 — 변경 시 대시보드 전체가 갱신된다 */
export default function FilterBar({ dataset }: { dataset: DemoDataset }) {
  const { filters, setFilters } = useApp();

  const selectCls =
    "h-9 rounded-xl border border-line bg-navy-850 px-2.5 text-[12.5px] text-ink-soft outline-none transition-colors hover:border-line-strong focus:border-accent max-w-[46vw]";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="flex rounded-xl border border-line bg-navy-850 p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setFilters({ rangeDays: r.value })}
            className={`rounded-[10px] px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-200 ${
              filters.rangeDays === r.value
                ? "bg-accent text-white shadow-md shadow-accent/25"
                : "text-ink-dim hover:text-ink-soft"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
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
