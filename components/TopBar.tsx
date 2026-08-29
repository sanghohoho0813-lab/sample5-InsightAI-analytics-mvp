"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import DateRangePicker from "./DateRangePicker";
import NotificationBell from "./NotificationBell";
import LiveClock, { LiveTime } from "./LiveClock";
import Logo from "./Logo";
import { MiraeWordmark } from "./MiraeLogo";
import { BRAND } from "@/lib/brand";

const TITLES: Record<string, string> = {
  "/dashboard": "홈 대시보드",
  "/analytics": "분석",
  "/explore": "데이터 탐색",
  "/insights": "AI 인사이트",
  "/ai": "AI 질의",
  "/forecast": "예측",
  "/anomalies": "이상 감지",
  "/notifications": "알림",
  "/reports": "보고서",
  "/data": "데이터 관리",
  "/settings": "설정",
  "/more": "더보기",
};

const SELECT_CLS =
  "h-12 min-w-0 max-w-[190px] flex-shrink rounded-xl border border-line bg-surface px-3 text-[18px] font-medium text-ink outline-none transition-colors hover:border-line-strong focus:border-brand";

const FILTER_ROUTES = ["/dashboard", "/analytics", "/explore", "/insights", "/anomalies", "/reports"];

/** 데스크톱 상단 툴바(2행) + 모바일 컴팩트 헤더 */
export default function TopBar() {
  const pathname = usePathname();
  const { dataset, filters, setFilters } = useApp();
  const title = TITLES[pathname] ?? BRAND.product;
  // 모바일 홈(데이터 연결됨)은 전용 헤더를 가지므로 여기서는 렌더하지 않는다.
  const hideOnMobile = pathname === "/dashboard" && dataset != null;
  const showFilters = dataset != null && FILTER_ROUTES.includes(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
      {/* 데스크톱 1행 — 타이틀 + 액션 */}
      <div className="hidden h-[74px] items-center gap-3 px-6 lg:flex">
        <h1 className="whitespace-nowrap text-[27px] font-bold tracking-tight text-ink">{title}</h1>
        <span className="mx-1 hidden h-7 w-px bg-line xl:block" />
        <LiveClock className="hidden xl:flex" />
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/reports"
            className="flex h-12 items-center gap-2 whitespace-nowrap rounded-xl bg-brand px-4 text-[18px] font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Sparkles className="h-6 w-6" />
            보고서 생성
          </Link>
          <NotificationBell />
          <Link
            href="/settings"
            aria-label="설정"
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Settings className="h-6 w-6" />
          </Link>
          <span className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-line bg-surface py-1 pl-1 pr-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-[17px] font-bold text-brand">
              {BRAND.user.initial}
            </span>
            <span className="hidden leading-tight xl:block">
              <span className="block text-[16px] font-bold text-ink">{BRAND.user.name}님</span>
              <span className="block text-[13.5px] font-semibold text-brand">{BRAND.company}</span>
            </span>
          </span>
        </div>
      </div>

      {/* 데스크톱 2행 — 필터 + 제작 표기 */}
      {showFilters && dataset && (
        <div className="hidden h-[64px] items-center gap-2.5 border-t border-line px-6 lg:flex">
          <DateRangePicker dataset={dataset} />
          <select
            value={filters.channel}
            onChange={(e) => setFilters({ channel: e.target.value })}
            aria-label="채널 필터"
            className={SELECT_CLS}
          >
            <option value="all">전체 채널</option>
            {dataset.channels.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filters.product}
            onChange={(e) => setFilters({ product: e.target.value })}
            aria-label="상품 필터"
            className={SELECT_CLS}
          >
            <option value="all">전체 상품</option>
            {dataset.products.map((pr) => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>
          <span className="ml-auto hidden items-center gap-3 whitespace-nowrap xl:flex">
            <span className="text-[14px] font-bold uppercase tracking-[0.14em] text-ink-dim">built by</span>
            <MiraeWordmark height={36} />
          </span>
        </div>
      )}

      {/* 모바일 */}
      {!hideOnMobile && (
        <div className="flex h-[66px] items-center gap-2.5 px-4 lg:hidden">
          <Link href="/" aria-label={`${BRAND.company} ${BRAND.product} 홈`}>
            <Logo size={30} showText={false} />
          </Link>
          <h1 className="truncate text-[21px] font-bold tracking-tight text-ink">{title}</h1>
          <span className="tabular ml-1 shrink-0 text-[17px] font-bold text-ink-soft" suppressHydrationWarning>
            <LiveTime />
          </span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
      )}
    </header>
  );
}
