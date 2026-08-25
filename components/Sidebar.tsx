"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Compass,
  Database,
  FileText,
  LayoutDashboard,
  LineChart,
  Settings,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/lib/store";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/analytics", label: "분석", icon: BarChart3 },
  { href: "/explore", label: "데이터 탐색", icon: Compass },
  { href: "/insights", label: "AI 인사이트", icon: Sparkles },
  { href: "/ai", label: "AI 질의", icon: Bot },
  { href: "/forecast", label: "예측", icon: LineChart },
  { href: "/anomalies", label: "이상징후", icon: AlertTriangle },
  { href: "/reports", label: "보고서", icon: FileText },
  { href: "/data", label: "데이터 관리", icon: Database },
  { href: "/settings", label: "설정", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { dataset } = useApp();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-navy-900 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-cyan-accent text-sm font-bold text-white shadow-lg shadow-accent/30">
          iA
        </span>
        <span className="text-[17px] font-bold tracking-tight">
          Insight<span className="text-accent-bright">AI</span>
        </span>
      </Link>

      <nav className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200 ${
                active
                  ? "bg-accent text-white shadow-lg shadow-accent/25"
                  : "text-ink-soft hover:bg-navy-800 hover:text-ink"
              }`}
            >
              <Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 p-4">
        <div className="card p-4">
          <div className="flex items-center justify-between text-[13px] font-semibold">
            <span>Pro 플랜</span>
            <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] font-medium text-accent-bright">
              활성
            </span>
          </div>
          <p className="mt-2 text-[11px] text-ink-dim">데이터 사용량 78%</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-navy-700">
            <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-accent to-cyan-accent" />
          </div>
          <p className="mt-2 text-[11px] text-ink-dim">다음 결제일 2024.06.15</p>
        </div>
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-700 text-xs font-semibold text-accent-bright">
            김
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">김대표</p>
            <p className="truncate text-[11px] text-ink-dim">
              {dataset ? dataset.name : "데이터 미연결"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
