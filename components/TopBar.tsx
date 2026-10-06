"use client";

import Link from "next/link";
import DateLine from "./DateLine";
import DatasetSwitcher from "./DatasetSwitcher";
import Logo from "./Logo";

/** 데모임을 숨기지 않는다 — 샘플 데이터·규칙 기반 엔진이라는 사실을 항상 표시 */
function DemoBadge() {
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-full border border-line-strong px-2 py-0.5 text-caption font-semibold text-ink-soft"
      title="샘플 데이터와 규칙 기반 분석 엔진으로 동작하는 데모입니다."
    >
      데모
    </span>
  );
}

/**
 * 최소 상단 바 — 지금 보는 데이터(눌러서 전환) · 데모 표기 · 오늘 날짜.
 * 페이지 제목과 행동은 본문(PageHeader)이 담당한다.
 */
export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="hidden h-14 items-center gap-2 px-6 lg:flex">
        <DatasetSwitcher />
        <DemoBadge />
        <DateLine className="ml-auto text-meta font-medium text-ink" />
      </div>

      <div className="flex h-14 items-center gap-1 px-3 lg:hidden">
        <Link href="/dashboard" aria-label="InsightAI 대시보드" className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Logo size={24} showText={false} />
        </Link>
        <DatasetSwitcher className="flex-1" />
        <DemoBadge />
      </div>
    </header>
  );
}
