"use client";

/** 페이지 설명줄 — 타이틀은 상단 툴바(TopBar)가 담당한다. */
export default function PageHeader({
  subtitle,
  actions,
}: {
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  if (!subtitle && !actions) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      {subtitle && <p className="text-[13px] text-ink-soft">{subtitle}</p>}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
