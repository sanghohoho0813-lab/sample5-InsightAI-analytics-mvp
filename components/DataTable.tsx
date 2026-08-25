"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react";
import { DataRow } from "@/lib/types";
import { formatKRWExact, formatNumber } from "@/lib/format";

const PAGE_SIZE = 10;

type SortKey = "date" | "channel" | "product" | "revenue" | "orders" | "customers" | "conversionRate" | "aov";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "date", label: "Date", align: "left" },
  { key: "channel", label: "Channel", align: "left" },
  { key: "product", label: "Product", align: "left" },
  { key: "revenue", label: "Revenue", align: "right" },
  { key: "orders", label: "Orders", align: "right" },
  { key: "customers", label: "Customers", align: "right" },
  { key: "conversionRate", label: "Conversion", align: "right" },
  { key: "aov", label: "AOV", align: "right" },
];

/** 데이터 미리보기 테이블 — 컬럼 정렬, 고정 헤더, 페이지네이션 */
export default function DataTable({ rows }: { rows: DataRow[] }) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "asc" });

  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const view = useMemo(
    () => sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [sorted, safePage]
  );

  const toggleSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
    setPage(0);
  };

  return (
    <div>
      <div className="max-h-[560px] overflow-auto rounded-xl border border-line">
        <table className="w-full min-w-[1120px] text-[18px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-line bg-surface-soft text-left text-[16px] uppercase tracking-wide text-ink-dim">
              {COLUMNS.map((c) => {
                const active = sort.key === c.key;
                const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
                return (
                  <th key={c.key} className={`px-4 py-3 font-semibold ${c.align === "right" ? "text-right" : ""}`}>
                    <button
                      onClick={() => toggleSort(c.key)}
                      aria-label={`${c.label} 정렬`}
                      className={`inline-flex items-center gap-1.5 transition-colors hover:text-ink ${
                        active ? "text-brand" : ""
                      } ${c.align === "right" ? "flex-row-reverse" : ""}`}
                    >
                      {c.label}
                      <Icon className="h-[18px] w-[18px]" />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr
                key={`${r.date}-${r.channel}-${r.product}-${i}`}
                className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-soft"
              >
                <td className="tabular px-4 py-3 text-ink-soft">{r.date}</td>
                <td className="px-4 py-3 text-ink">{r.channel}</td>
                <td className="px-4 py-3 text-ink-soft">{r.product}</td>
                <td className="tabular px-4 py-3 text-right font-semibold text-ink">{formatKRWExact(r.revenue)}</td>
                <td className="tabular px-4 py-3 text-right text-ink">{formatNumber(r.orders)}</td>
                <td className="tabular px-4 py-3 text-right text-ink">{formatNumber(r.customers)}</td>
                <td className="tabular px-4 py-3 text-right text-ink">{r.conversionRate.toFixed(2)}%</td>
                <td className="tabular px-4 py-3 text-right text-ink">{formatKRWExact(r.aov)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[17px] text-ink-dim">
        <span>
          총 {sorted.length.toLocaleString("ko-KR")}행 중 {safePage * PAGE_SIZE + 1}–
          {Math.min(sorted.length, (safePage + 1) * PAGE_SIZE)}행
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line transition-colors hover:border-line-strong disabled:opacity-40"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="tabular min-w-[72px] text-center font-semibold text-ink-soft">
            {safePage + 1} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={safePage >= pages - 1}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line transition-colors hover:border-line-strong disabled:opacity-40"
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
