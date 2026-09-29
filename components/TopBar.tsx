"use client";

import Link from "next/link";
import { useApp } from "@/lib/store";
import DateLine from "./DateLine";
import Logo from "./Logo";

/** 데모임을 숨기지 않는다 — 샘플 데이터·규칙 기반 엔진이라는 사실을 항상 표시 */
function DemoBadge() {
  return (
    <span
      className="whitespace-nowrap rounded-full border border-line-strong px-2 py-0.5 text-caption font-semibold text-ink-soft"
      title="샘플 데이터와 규칙 기반 분석 엔진으로 동작하는 데모입니다."
    >
      데모
    </span>
  );
}

/**
 * 최소 상단 바 — 현재 데이터 · 데모 표기 · 오늘 날짜.
 * 페이지 제목과 행동은 본문(PageHeader)이 담당한다.
 */
export default function TopBar() {
  const { dataset } = useApp();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="hidden h-14 items-center gap-3 px-8 lg:flex">
        <span className="truncate text-meta text-ink-soft">
          {dataset ? (
            <>
              <span className="text-ink-dim">데이터</span> <b className="font-semibold text-ink">{dataset.name}</b>
            </>
          ) : (
            " "
          )}
        </span>
        <DemoBadge />
        <DateLine className="ml-auto text-meta font-medium text-ink" />
      </div>

      <div className="flex h-14 items-center gap-2 px-4 lg:hidden">
        <Link href="/dashboard" aria-label="InsightAI 대시보드">
          <Logo size={24} />
        </Link>
        <span className="ml-auto" />
        <DemoBadge />
      </div>
    </header>
  );
}
