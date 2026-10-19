"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { MiraeSymbol } from "./MiraeLogo";
import Logo from "./Logo";
import { BRAND } from "@/lib/brand";
import { NavItem, PRIMARY_NAV, WORKSPACE_NAV, isActive } from "@/lib/nav";
import { unreadAlertCount } from "@/lib/notifications";
import { useApp } from "@/lib/store";

function NavLink({ item, active, count }: { item: NavItem; active: boolean; count?: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-10 items-center gap-3 rounded-[9px] px-3 text-sub transition-colors ${
        active ? "bg-white/[0.08] font-semibold text-white" : "font-medium text-nav-text hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {active && <span className="absolute inset-y-2.5 -left-3 w-[3px] rounded-r-full bg-brand-light" aria-hidden />}
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? "text-brand-light" : "text-nav-dim group-hover:text-nav-text"}`}
        strokeWidth={active ? 2.1 : 1.9}
        aria-hidden
      />
      <span className="flex-1">{item.label}</span>
      {count != null && count > 0 && (
        <span
          className="tabular min-w-5 rounded-full bg-negative px-1.5 text-center text-[12px] font-bold leading-5 text-white"
          aria-label={`미확인 ${count}건`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/**
 * 데스크톱 내비게이션 — 분석 6개 + 작업 공간 3개, 아래에 사용자.
 * 그래파이트 바탕에 아이콘은 단색, 활성 항목만 브랜드 블루로 표시한다.
 */
export default function Sidebar() {
  const pathname = usePathname();
  const { dataset, readIds } = useApp();
  const unread = useMemo(() => unreadAlertCount(dataset, readIds), [dataset, readIds]);
  const counts: Record<string, number | undefined> = { "/anomalies": unread };
  const label = "mb-1.5 px-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-nav-dim";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-nav lg:flex">
      <Link href="/dashboard" className="flex h-[60px] shrink-0 items-center px-5" aria-label={`${BRAND.product} 대시보드`}>
        <Logo size={24} tone="light" />
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3" aria-label="주요 메뉴">
        <p className={label}>분석</p>
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} count={counts[item.href]} />
          ))}
        </div>
        <p className={`${label} mt-7`}>작업 공간</p>
        <div className="space-y-0.5">
          {WORKSPACE_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>

      <div className="border-t border-nav-line p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-[9px] px-2 py-2 transition-colors hover:bg-white/[0.05]"
          aria-label={`${BRAND.user.display} · 설정`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-sub font-bold text-white ring-2 ring-white/10">
            {BRAND.user.initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sub font-semibold text-white">{BRAND.user.name}님</span>
            <span className="block truncate text-caption text-nav-dim">{BRAND.user.role}</span>
          </span>
        </Link>
        <a
          href={BRAND.links.home}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-2 rounded-[9px] px-2 py-2 text-caption text-nav-dim transition-colors hover:text-nav-text"
        >
          <span className="rounded bg-white px-1 py-0.5">
            <MiraeSymbol height={12} />
          </span>
          {BRAND.company} 제작 샘플
        </a>
      </div>
    </aside>
  );
}
