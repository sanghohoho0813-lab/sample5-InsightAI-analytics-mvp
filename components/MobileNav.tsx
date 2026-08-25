"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bot, LayoutDashboard, LineChart, Menu } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/ai", label: "AI", icon: Bot, center: true },
  { href: "/forecast", label: "예측", icon: LineChart },
  { href: "/more", label: "더보기", icon: Menu },
];

/** 모바일 하단 네비게이션 — 중앙 AI 버튼 강조 */
export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-navy-900/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, icon: Icon, center }) => {
          const active = pathname === href;
          if (center) {
            return (
              <Link key={href} href={href} className="-mt-7 flex flex-col items-center" aria-label="AI 질의">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan-accent text-white shadow-xl shadow-accent/40 transition-transform duration-200 ${
                    active ? "scale-105 ring-2 ring-accent-bright/60" : "active:scale-95"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className={`mt-1 text-[10px] font-medium ${active ? "text-accent-bright" : "text-ink-dim"}`}>
                  {label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[56px] flex-col items-center gap-1 rounded-lg py-1.5 transition-colors ${
                active ? "text-accent-bright" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
