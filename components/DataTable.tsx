"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp } from "lucide-react";
import { DataRow, DerivedField } from "@/lib/types";
import { formatKRWExact, formatNumber } from "@/lib/format";

const PAGE_SIZE = 10;

type SortKey = "date" | "channel" | "product" | "revenue" | "orders" | "customers" | "conversionRate" | "aov";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "date", label: "날짜", align: "left" },
  { key: "channel", label: "채널", align: "left" },
  { key: "product", label: "상품", align: "left" },
  { key: "revenue", label: "매출", align: "right" },
  { key: "orders", label: "주문", align: "right" },
  { key: "customers", label: "고객", align: "right" },
  { key: "conversionRate", label: "전환율", align: "right" },
  { key: "aov", label: "객단가", align: "right" },
];

/** 데이터 미리보기 테이블 — 컬럼 정렬, 고정 헤더, 페이지네이션 */
const CELL: Record<SortKey, (r: DataRow) => string> = {
  date: (r) => r.date,
  channel: (r) => r.channel,
  product: (r) => r.product,
  revenue: (r) => formatKRWExact(r.revenue),
  orders: (r) => formatNumber(r.orders),
  customers: (r) => formatNumber(r.customers),
  conversionRate: (r) => `${r.conversionRate.toFixed(2)}%`,
  aov: (r) => formatKRWExact(r.aov),
};

/** 각 열이 기대는 원본 필드 — 파일에 없던 필드의 열은 숨긴다(추정치를 원본처럼 보이지 않게) */
const NEEDS: Partial<Record<SortKey, DerivedField[]>> = {
  channel: ["channel"],
  product: ["product"],
  orders: ["orders"],
  customers: ["customers"],
  conversionRate: ["orders", "visitors"],
  aov: ["orders"],
};

export default function DataTable({ rows, derived = [] }: { rows: DataRow[]; derived?: DerivedField[] }) {
  const columns = COLUMNS.filter((c) => !(NEEDS[c.key] ?? []).some((f) => derived.includes(f)));
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
      <div className="max-h-[480px] overflow-auto rounded-control border border-line">
        <table className="w-full text-meta" style={{ minWidth: columns.length * 110 }}>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-line bg-surface-soft text-left text-caption text-ink-dim">
              {columns.map((c) => {
                const active = sort.key === c.key;
                const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ChevronUp : ChevronDown;
                return (
                  <th key={c.key} className={`px-3 py-1 font-semibold ${c.align === "right" ? "text-right" : ""}`}>
                    <button
                      onClick={() => toggleSort(c.key)}
                      aria-label={`${c.label} 정렬`}
                      className={`inline-flex min-h-8 items-center gap-1 transition-colors hover:text-ink ${
                        active ? "text-brand" : ""
                      } ${c.align === "right" ? "flex-row-reverse" : ""}`}
                    >
                      {c.label}
                      <Icon className="h-3.5 w-3.5" aria-hidden />
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
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2.5 ${c.align === "right" ? "tabular text-right" : ""} ${
                      c.key === "revenue" ? "font-semibold text-ink" : c.key === "date" || c.key === "product" ? "tabular text-ink-soft" : "text-ink"
                    }`}
                  >
                    {CELL[c.key](r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-meta text-ink-dim">
        <span>
          총 {sorted.length.toLocaleString("ko-KR")}행 중 {safePage * PAGE_SIZE + 1}–
          {Math.min(sorted.length, (safePage + 1) * PAGE_SIZE)}행
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="flex h-11 w-11 items-center justify-center rounded-control border border-line bg-surface transition-colors hover:border-line-strong disabled:opacity-40"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular min-w-16 text-center font-semibold text-ink-soft">
            {safePage + 1} / {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={safePage >= pages - 1}
            className="flex h-11 w-11 items-center justify-center rounded-control border border-line bg-surface transition-colors hover:border-line-strong disabled:opacity-40"
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
