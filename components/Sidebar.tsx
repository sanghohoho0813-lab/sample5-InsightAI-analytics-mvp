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
import Logo from "./Logo";
import { MiraeLockup } from "./MiraeLogo";
import { BRAND } from "@/lib/brand";
import { useApp } from "@/lib/store";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "홈", icon: LayoutDashboard },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/explore", label: "데이터 탐색", icon: Compass },
  { href: "/insights", label: "AI 인사이트", icon: Sparkles },
  { href: "/ai", label: "AI 질의", icon: Bot },
  { href: "/forecast", label: "예측", icon: LineChart },
  { href: "/anomalies", label: "이상 감지", icon: AlertTriangle },
  { href: "/notifications", label: "알림", icon: Bell },
  { href: "/reports", label: "보고서", icon: FileText },
  { href: "/data", label: "데이터 관리", icon: Database },
  { href: "/settings", label: "설정", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { dataset, showToast } = useApp();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[292px] flex-col border-r border-line bg-surface lg:flex">
      <Link href="/" className="block px-5 py-4">
        <Logo />
        <span className="mt-3 block border-t border-line pt-3">
          <span className="mb-2 block text-[13px] font-bold uppercase tracking-[0.14em] text-ink-dim">
            built by
          </span>
          <MiraeLockup size="md" />
        </span>
      </Link>

      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3 pb-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[20px] transition-colors duration-200 ${
                active
                  ? "bg-brand-soft font-semibold text-brand"
                  : "font-medium text-ink-soft hover:bg-surface-soft hover:text-ink"
              }`}
            >
              <Icon className="h-[25px] w-[25px]" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2.5 p-3.5">
        <div className="rounded-xl border border-line bg-surface-soft p-3.5">
          <div className="flex items-center justify-between text-[19.5px] font-semibold text-ink">
            <span>Pro 플랜</span>
            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[16px] font-medium text-brand">
              활성
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[16.5px] text-ink-dim">
            <span>데이터 사용량</span>
            <span className="font-semibold text-ink-soft">78%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full w-[78%] rounded-full bg-brand" />
          </div>
          <p className="mt-2 text-[16.5px] text-ink-dim">다음 결제일 2024.06.15</p>
        </div>

        <button
          onClick={() => showToast("도움말 센터는 정식 버전에서 제공됩니다.", "info")}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[19.5px] font-medium text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
        >
          <CircleHelp className="h-[25px] w-[25px]" strokeWidth={1.8} />
          도움말 및 지원
        </button>

        <div className="flex items-center gap-2.5 border-t border-line px-1 pt-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[18px] font-bold text-brand">
            {BRAND.user.initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[18px] font-bold text-ink">{BRAND.user.name}님</p>
            <p className="truncate text-[15px] font-medium text-brand">{BRAND.company}</p>
            <p className="truncate text-[14px] text-ink-dim">
              {dataset ? dataset.name : "데이터 미연결"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
