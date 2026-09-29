"use client";

import Link from "next/link";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useApp } from "@/lib/store";

export default function ToastStack() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed inset-x-4 bottom-20 z-[90] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:max-w-[420px] lg:bottom-6"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="card animate-fade-up flex w-full items-start gap-3 px-4 py-3 text-sub shadow-overlay"
        >
          {t.type === "success" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-positive" aria-hidden />}
          {t.type === "error" && <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-negative" aria-hidden />}
          {t.type === "info" && <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" aria-hidden />}
          <span className="flex-1 text-ink">{t.message}</span>
          {t.action && (
            <Link
              href={t.action.href}
              onClick={() => dismissToast(t.id)}
              className="shrink-0 font-semibold text-brand hover:text-brand-dark"
            >
              {t.action.label}
            </Link>
          )}
          <button
            onClick={() => dismissToast(t.id)}
            className="-mr-1 shrink-0 text-ink-dim transition-colors hover:text-ink"
            aria-label="알림 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
