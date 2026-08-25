"use client";

import Link from "next/link";
import { CalendarDays, FileText } from "lucide-react";
import { useApp } from "@/lib/store";

export default function PageHeader({
  title,
  subtitle,
  showReportCta = false,
  actions,
}: {
  title: string;
  subtitle?: string;
  showReportCta?: boolean;
  actions?: React.ReactNode;
}) {
  const { dataset } = useApp();
  return (
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-[22px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {dataset && (
          <span className="hidden items-center gap-1.5 rounded-xl border border-line bg-navy-850 px-3 py-2 text-xs text-ink-soft md:flex">
            <CalendarDays className="h-3.5 w-3.5 text-ink-dim" />
            {dataset.periodLabel}
          </span>
        )}
        {actions}
        {showReportCta && (
          <Link
            href="/reports"
            className="flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-accent/25 transition-colors hover:bg-accent-bright"
          >
            <FileText className="h-4 w-4" />
            보고서 생성
          </Link>
        )}
      </div>
    </header>
  );
}
