"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CircleHelp,
  Compass,
  Database,
  FileText,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
} from "lucide-react";
import { MiraeWordmark } from "./MiraeLogo";
import { BRAND } from "@/lib/brand";
import { HUES, HueName } from "@/lib/palette";
import { useApp } from "@/lib/store";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  hue: HueName;
}

/** 섹션으로 묶은 내비게이션 — 항목마다 고유 색상 칩을 갖는다. */
export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/dashboard", label: "홈 대시보드", icon: LayoutDashboard, hue: "blue" },
      { href: "/insights", label: "AI 인사이트", icon: Sparkles, hue: "amber" },
    ],
  },
  {
    title: "ANALYTICS",
    items: [
      { href: "/analytics", label: "분석", icon: BarChart3, hue: "violet" },
      { href: "/explore", label: "데이터 탐색", icon: Compass, hue: "cyan" },
      { href: "/forecast", label: "예측", icon: LineChart, hue: "mint" },
    ],
  },
  {
    title: "MONITORING",
    items: [
      { href: "/anomalies", label: "이상 감지", icon: AlertTriangle, hue: "coral" },
      { href: "/notifications", label: "알림", icon: Bell, hue: "rose" },
    ],
  },
  {
    title: "WORKSPACE",
    items: [
      { href: "/ai", label: "AI 질의", icon: Bot, hue: "blue" },
      { href: "/reports", label: "보고서", icon: FileText, hue: "amber" },
      { href: "/data", label: "데이터 관리", icon: Database, hue: "cyan" },
      { href: "/settings", label: "설정", icon: Settings, hue: "slate" },
    ],
  },
];

/** 모바일 '더보기' 등에서 쓰는 평면 목록 */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export default function Sidebar() {
  const pathname = usePathname();
  const { dataset, showToast } = useApp();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[292px] flex-col bg-nav lg:flex">
      <Link href="/dashboard" className="block px-5 pb-3.5 pt-4">
        <span className="block text-[24px] font-extrabold leading-tight tracking-tight text-white">
          Insight<span className="text-brand-light">AI</span>
        </span>
        <span className="mt-1 block whitespace-nowrap text-[13px] font-bold tracking-[0.1em] text-amber">
          AI ANALYTICS INTELLIGENCE
        </span>
      </Link>

      <nav className="relative flex-1 overflow-y-auto px-3 pb-2 [mask-image:linear-gradient(to_bottom,#000_calc(100%-24px),transparent)]">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-3.5 last:mb-1">
            <p className="mb-1.5 px-3 text-[12.5px] font-bold tracking-[0.16em] text-nav-dim">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon, hue }) => {
                const active = pathname === href;
                const c = HUES[hue];
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[17px] transition-colors duration-200 ${
                      active
                        ? "bg-nav-soft font-bold text-white"
                        : "font-medium text-nav-text hover:bg-nav-soft/60 hover:text-white"
                    }`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]"
                      style={{ backgroundColor: `${c.base}26`, color: c.light }}
                    >
                      <Icon className="h-5 w-5" strokeWidth={active ? 2.3 : 1.9} />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={() => showToast("도움말 센터는 정식 버전에서 제공됩니다.", "info")}
          className="mb-2 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[17px] font-medium text-nav-text transition-colors hover:bg-nav-soft/60 hover:text-white"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-white/10 text-nav-dim">
            <CircleHelp className="h-5 w-5" strokeWidth={1.9} />
          </span>
          도움말 및 지원
        </button>
      </nav>

      <div className="space-y-2.5 border-t border-nav-line p-3.5">
        <div className="rounded-xl bg-nav-soft p-3.5">
          <div className="flex items-center justify-between text-[16px] font-bold text-white">
            <span>Pro 플랜</span>
            <span className="rounded-md bg-mint/20 px-2 py-0.5 text-[13px] font-semibold text-mint-soft">
              활성
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[14px] text-nav-dim">
            <span>데이터 사용량</span>
            <span className="font-bold text-nav-text">78%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-brand to-aqua" />
          </div>
          <p className="mt-1.5 text-[13px] text-nav-dim">결제일 매월 15일</p>
        </div>

        <div className="flex items-center gap-3 border-t border-nav-line px-1 pt-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/20 text-[17px] font-bold text-brand-light">
            {BRAND.user.initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[18px] font-bold text-white">{BRAND.user.name}님</p>
            <p className="truncate text-[14px] text-nav-dim">
              {dataset ? dataset.name : "데이터 미연결"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-nav-line pt-3">
          <span className="shrink-0 text-[12.5px] font-bold tracking-[0.16em] text-nav-dim">BUILT BY</span>
          <MiraeWordmark height={34} variant="light" />
        </div>
      </div>
    </aside>
  );
}
