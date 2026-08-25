"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertOctagon, AlertTriangle, Bell, ChevronRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { buildNotifications, unreadCount } from "@/lib/notifications";
import { formatDateKR } from "@/lib/format";

/** 상단 알림 벨 — 미읽음 배지 + 최근 알림 드롭다운 */
export default function NotificationBell() {
  const { dataset, readIds, markRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const items = useMemo(() => buildNotifications(dataset, readIds), [dataset, readIds]);
  const unread = unreadCount(items);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markRead(items.map((n) => n.id));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `알림 ${unread}건` : "알림"}
        aria-expanded={open}
        className="relative flex h-12 w-12 items-center justify-center rounded-[10px] border border-line bg-surface text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
      >
        <Bell className="h-[25px] w-[25px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-negative px-1 text-[15px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="card animate-fade-in absolute right-0 z-50 mt-2 w-[min(320px,88vw)] overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-[20px] font-semibold text-ink">알림</p>
            <span className="text-[17px] text-ink-dim">최근 30일</span>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[19px] text-ink-dim">새로운 알림이 없습니다.</p>
          ) : (
            <ul className="max-h-[300px] overflow-y-auto">
              {items.slice(0, 5).map((n) => {
                const Icon = n.severity === "critical" ? AlertOctagon : AlertTriangle;
                const tone = n.severity === "critical" ? "text-negative bg-negative-soft" : "text-warning bg-warning-soft";
                return (
                  <li key={n.id} className="border-b border-line/70 last:border-0">
                    <Link href="/notifications" onClick={() => setOpen(false)} className="flex gap-2.5 px-4 py-3 transition-colors hover:bg-surface-soft">
                      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[19px] font-semibold text-ink">{n.title}</span>
                        <span className="mt-0.5 block line-clamp-2 text-[17px] leading-relaxed text-ink-soft">
                          {n.description}
                        </span>
                        <span className="mt-1 block text-[16px] text-ink-dim">{formatDateKR(n.date)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1 border-t border-line py-2.5 text-[19px] font-semibold text-brand transition-colors hover:bg-brand-soft"
          >
            모든 알림 보기 <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      )}
    </div>
  );
}
