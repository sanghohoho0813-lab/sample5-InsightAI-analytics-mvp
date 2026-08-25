"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, House, Menu, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { buildNotifications, unreadCount } from "@/lib/notifications";
import { useMemo } from "react";

const ITEMS = [
  { href: "/dashboard", label: "홈", icon: House },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/ai", label: "AI", icon: Sparkles, center: true },
  { href: "/notifications", label: "알림", icon: Bell, badge: true },
  { href: "/more", label: "더보기", icon: Menu },
];

/** 모바일 하단 네비게이션 — 중앙 AI 버튼 강조 */
export default function MobileNav() {
  const pathname = usePathname();
  const { dataset, readIds } = useApp();
  const unread = useMemo(
    () => unreadCount(buildNotifications(dataset, readIds)),
    [dataset, readIds]
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, icon: Icon, center, badge }) => {
          const active = pathname === href;
          if (center) {
            return (
              <Link key={href} href={href} className="-mt-7 flex flex-col items-center" aria-label="AI 질의">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/35 transition-transform duration-200 ${
                    active ? "scale-105 ring-4 ring-brand-soft" : "active:scale-95"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className={`mt-1 text-[10px] font-semibold ${active ? "text-brand" : "text-ink-dim"}`}>
                  {label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-1 rounded-lg transition-colors ${
                active ? "text-brand" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              <span className="relative">
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                {badge && unread > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-negative px-1 text-[9px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
