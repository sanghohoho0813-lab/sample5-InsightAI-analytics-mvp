"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { openPalette } from "./CommandPalette";
import DateLine from "./DateLine";
import DatasetSwitcher from "./DatasetSwitcher";
import Logo from "./Logo";

/** 데모임을 숨기지 않는다 — 샘플 데이터·규칙 기반 엔진이라는 사실을 항상 표시 */
function DemoBadge() {
  return (
    <span
      className="shrink-0 whitespace-nowrap rounded-full border border-line-strong bg-surface px-2 py-0.5 text-caption font-semibold text-ink-soft"
      title="규칙 기반 분석 엔진으로 동작하는 데모입니다. 데이터는 이 브라우저에만 저장됩니다."
    >
      데모
    </span>
  );
}

/** 빠른 이동 열기 — 넓은 화면은 단축키를 함께 보여주는 칸, 좁은 화면은 아이콘 */
function PaletteButton({ compact = false }: { compact?: boolean }) {
  // 단축키 표기는 브라우저에서만 알 수 있어 그려진 뒤에 맞춘다(서버 렌더와 어긋나지 않게).
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.userAgent)), []);
  if (compact) {
    return (
      <button onClick={openPalette} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-soft hover:bg-surface-soft hover:text-ink" aria-label="빠른 이동">
        <Search className="h-5 w-5" aria-hidden />
      </button>
    );
  }
  return (
    <button
      onClick={openPalette}
      aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}
      className="ml-auto flex h-9 w-[248px] items-center gap-2 rounded-control border border-line-strong bg-surface px-3 text-meta text-ink-dim shadow-subtle transition-colors hover:border-ink-dim hover:text-ink-soft"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 text-left">빠른 이동</span>
      <kbd className="rounded-[5px] border border-line bg-surface-soft px-1.5 text-caption font-semibold" aria-hidden>
        {mac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}

/**
 * 최소 상단 바 — 지금 보는 데이터(눌러서 전환) · 데모 표기 · 오늘 날짜.
 * 페이지 제목과 행동은 본문(PageHeader)이 담당한다.
 */
export default function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
      <div className="hidden h-[60px] items-center gap-2 px-6 lg:flex xl:px-8">
        <DatasetSwitcher />
        <DemoBadge />
        <PaletteButton />
        <DateLine className="ml-3 text-meta font-medium text-ink" />
      </div>

      <div className="flex h-14 items-center gap-1 px-3 lg:hidden">
        <Link href="/dashboard" aria-label="InsightAI 대시보드" className="flex h-10 w-10 shrink-0 items-center justify-center">
          <Logo size={24} showText={false} />
        </Link>
        <DatasetSwitcher className="flex-1" />
        <PaletteButton compact />
        <DemoBadge />
      </div>
    </header>
  );
}
