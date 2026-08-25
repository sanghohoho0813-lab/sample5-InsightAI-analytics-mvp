"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import DateRangePicker from "./DateRangePicker";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";

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
  "h-9 max-w-[150px] rounded-[10px] border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink outline-none transition-colors hover:border-line-strong focus:border-brand";

/** 데스크톱 상단 툴바 + 모바일 컴팩트 헤더 */
export default function TopBar() {
  const pathname = usePathname();
  const { dataset, filters, setFilters } = useApp();
  const title = TITLES[pathname] ?? "InsightAI";
  // 모바일 홈(데이터 연결됨)은 전용 헤더를 가지므로 여기서는 렌더하지 않는다.
  const hideOnMobile = pathname === "/dashboard" && dataset != null;
  const showFilters = dataset != null && ["/dashboard", "/analytics", "/explore", "/insights", "/anomalies", "/reports"].includes(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      {/* 데스크톱 */}
      <div className="hidden h-16 items-center gap-3 px-6 lg:flex">
        <h1 className="text-[21px] font-bold tracking-tight text-ink">{title}</h1>
        {showFilters && dataset && (
          <div className="ml-3 flex items-center gap-2">
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
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/reports"
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            <Sparkles className="h-4 w-4" />
            보고서 생성
          </Link>
          <NotificationBell />
          <Link
            href="/settings"
            aria-label="설정"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
          >
            <Settings className="h-[17px] w-[17px]" />
          </Link>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-[12px] font-semibold text-brand">
            김
          </span>
        </div>
      </div>

      {/* 모바일 */}
      {!hideOnMobile && (
        <div className="flex h-14 items-center gap-2 px-4 lg:hidden">
          <Link href="/" aria-label="InsightAI 홈">
            <Logo size={26} showText={false} />
          </Link>
          <h1 className="truncate text-[16px] font-bold tracking-tight text-ink">{title}</h1>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
      )}
    </header>
  );
}
