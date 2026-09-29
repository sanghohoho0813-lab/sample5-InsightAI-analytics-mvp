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
      className={`relative flex min-h-11 items-center gap-3 rounded-control px-3 text-sub transition-colors ${
        active ? "bg-nav-soft font-semibold text-white" : "font-medium text-nav-text hover:bg-nav-soft/60 hover:text-white"
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-light" aria-hidden />}
      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-light" : "text-nav-dim"}`} strokeWidth={2} aria-hidden />
      <span className="flex-1">{item.label}</span>
      {count != null && count > 0 && (
        <span className="tabular rounded-full bg-white/10 px-2 text-caption font-semibold text-white" aria-label={`미확인 ${count}건`}>
          {count}
        </span>
      )}
    </Link>
  );
}

/** 데스크톱 내비게이션 — 핵심 6개 + 작업 공간 3개. 아이콘은 단색, 활성 항목만 브랜드색. */
export default function Sidebar() {
  const pathname = usePathname();
  const { dataset, readIds } = useApp();
  const unread = useMemo(() => unreadAlertCount(dataset, readIds), [dataset, readIds]);
  const counts: Record<string, number | undefined> = { "/anomalies": unread };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col bg-nav lg:flex">
      <Link href="/dashboard" className="flex h-16 items-center px-5" aria-label={`${BRAND.product} 대시보드`}>
        <Logo size={26} tone="light" />
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="주요 메뉴">
        <div className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} count={counts[item.href]} />
          ))}
        </div>
        <p className="mb-2 mt-6 px-3 text-caption font-semibold text-nav-dim">작업 공간</p>
        <div className="space-y-1">
          {WORKSPACE_NAV.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>

      <div className="border-t border-nav-line px-5 py-4">
        <p className="text-caption text-nav-dim">분석 중인 데이터</p>
        <Link href="/data" className="mt-1 block truncate text-sub font-semibold text-white hover:underline">
          {dataset?.name ?? "데이터 선택"}
        </Link>
        <a
          href={BRAND.links.home}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-2 text-caption text-nav-dim transition-colors hover:text-nav-text"
        >
          <span className="rounded bg-white px-1 py-0.5">
            <MiraeSymbol height={14} />
          </span>
          {BRAND.company} 제작 샘플
        </a>
      </div>
    </aside>
  );
}
