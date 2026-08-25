"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AlertOctagon, AlertTriangle, BellOff, CheckCheck } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import { useApp } from "@/lib/store";
import { buildNotifications, unreadCount } from "@/lib/notifications";
import { formatDateKR } from "@/lib/format";

/** 알림 센터 — 최근 30일 이상징후 기반 알림 목록 */
export default function NotificationsPage() {
  const { dataset, readIds, markRead, showToast } = useApp();
  const items = useMemo(() => buildNotifications(dataset, readIds), [dataset, readIds]);
  const unread = unreadCount(items);

  // 목록을 확인하면 읽음 처리한다.
  useEffect(() => {
    if (unread > 0) {
      const timer = setTimeout(() => markRead(items.map((n) => n.id)), 1200);
      return () => clearTimeout(timer);
    }
  }, [unread, items, markRead]);

  if (!dataset) {
    return (
      <>
        <PageHeader subtitle="감지된 이상징후를 알림으로 받아보세요" />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        subtitle={`${dataset.name} · 최근 30일 감지된 알림 ${items.length}건`}
        actions={
          unread > 0 ? (
            <button
              onClick={() => {
                markRead(items.map((n) => n.id));
                showToast("모든 알림을 읽음으로 표시했습니다.", "success");
              }}
              className="flex items-center gap-1.5 rounded-[10px] border border-line bg-surface px-3.5 py-2 text-[19px] font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <CheckCheck className="h-6 w-6" /> 모두 읽음
            </button>
          ) : undefined
        }
      />

      {items.length === 0 ? (
        <div className="card animate-fade-up flex flex-col items-center px-6 py-14 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-soft">
            <BellOff className="h-10 w-10 text-ink-dim" />
          </span>
          <p className="mt-4 text-[21px] font-semibold text-ink">새로운 알림이 없습니다</p>
          <p className="mt-1 text-[19px] text-ink-soft">최근 30일 동안 주의가 필요한 변화가 감지되지 않았습니다.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((n, i) => {
            const Icon = n.severity === "critical" ? AlertOctagon : AlertTriangle;
            const tone = n.severity === "critical" ? "text-negative bg-negative-soft" : "text-warning bg-warning-soft";
            return (
              <li key={n.id}>
                <Link
                  href="/anomalies"
                  className={`card card-hover animate-fade-up flex gap-3 p-4 ${n.read ? "" : "border-brand/25 bg-brand-soft/40"}`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] ${tone}`}>
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                      <span className="truncate text-[20px] font-semibold text-ink">{n.title}</span>
                      <span className="tabular ml-auto shrink-0 text-[16.5px] text-ink-dim">{formatDateKR(n.date)}</span>
                    </span>
                    <span className="mt-1 block text-[19px] leading-relaxed text-ink-soft">{n.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 text-[17px] leading-relaxed text-ink-dim">
        알림은 Critical·Warning 등급의 이상징후만 최근 30일 기준으로 전달됩니다. 감지 규칙은 이상 감지 화면에서 확인할 수 있습니다.
      </p>
    </>
  );
}
