"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AlertTriangle, FileText, LayoutDashboard, Lightbulb, Menu } from "lucide-react";
import { useApp } from "@/lib/store";
import { ALL_NAV, isActive } from "@/lib/nav";
import { unreadAlertCount } from "@/lib/notifications";

const TABS = [
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/anomalies", label: "이상 감지", icon: AlertTriangle },
  { href: "/insights", label: "인사이트", icon: Lightbulb },
  { href: "/reports", label: "보고서", icon: FileText },
  { href: "/more", label: "더보기", icon: Menu },
];

const TAB_HREFS = TABS.map((t) => t.href);

/** 모바일 하단 탭 5개 — 강조 버튼 없이 같은 무게로 둔다. */
export default function MobileNav() {
  const pathname = usePathname();
  const { dataset, readIds } = useApp();
  const unread = useMemo(() => unreadAlertCount(dataset, readIds), [dataset, readIds]);
  // 탭에 없는 메뉴(분석·예측·데이터 등)에 있을 때는 '더보기'를 활성으로 표시
  const inMore = !TAB_HREFS.some((h) => isActive(pathname, h)) && ALL_NAV.some((n) => isActive(pathname, n.href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="하단 메뉴"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href) || (href === "/more" && inMore);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? "text-brand" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {href === "/anomalies" && unread > 0 && (
                  <span
                    className="tabular absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-negative px-1 text-center text-[12px] font-bold leading-[18px] text-white"
                    aria-label={`미확인 ${unread}건`}
                  >
                    {unread}
                  </span>
                )}
              </span>
              <span className="text-caption font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
