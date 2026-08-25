"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DataRow } from "@/lib/types";
import { formatKRWExact, formatNumber } from "@/lib/format";

const PAGE_SIZE = 10;

/** 데이터 미리보기 테이블 — 페이지네이션 포함, 모바일 가로 스크롤 */
export default function DataTable({ rows }: { rows: DataRow[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const view = useMemo(() => rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [rows, page]);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[820px] text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-surface-soft text-left text-[11.5px] uppercase tracking-wide text-ink-dim">
              <th className="px-3.5 py-2.5 font-medium">Date</th>
              <th className="px-3.5 py-2.5 font-medium">Channel</th>
              <th className="px-3.5 py-2.5 font-medium">Product</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Revenue</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Orders</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Customers</th>
              <th className="px-3.5 py-2.5 text-right font-medium">Conversion</th>
              <th className="px-3.5 py-2.5 text-right font-medium">AOV</th>
            </tr>
          </thead>
          <tbody>
            {view.map((r, i) => (
              <tr key={`${r.date}-${r.channel}-${r.product}-${i}`} className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface-soft">
                <td className="tabular px-3.5 py-2.5 text-ink-soft">{r.date}</td>
                <td className="px-3.5 py-2.5">{r.channel}</td>
                <td className="px-3.5 py-2.5 text-ink-soft">{r.product}</td>
                <td className="tabular px-3.5 py-2.5 text-right font-medium">{formatKRWExact(r.revenue)}</td>
                <td className="tabular px-3.5 py-2.5 text-right">{formatNumber(r.orders)}</td>
                <td className="tabular px-3.5 py-2.5 text-right">{formatNumber(r.customers)}</td>
                <td className="tabular px-3.5 py-2.5 text-right">{r.conversionRate.toFixed(2)}%</td>
                <td className="tabular px-3.5 py-2.5 text-right">{formatKRWExact(r.aov)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-[12px] text-ink-dim">
        <span>총 {rows.length.toLocaleString("ko-KR")}행 중 {page * PAGE_SIZE + 1}–{Math.min(rows.length, (page + 1) * PAGE_SIZE)}행</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors hover:border-line-strong disabled:opacity-40"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular min-w-14 text-center">{page + 1} / {pages}</span>
          <button
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors hover:border-line-strong disabled:opacity-40"
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
