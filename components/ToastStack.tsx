"use client";

import { useApp } from "@/lib/store";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export default function ToastStack() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-4 z-[90] flex max-w-[90vw] flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="card animate-fade-up flex items-center gap-3 px-4 py-3 text-[21px] shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
        >
          {t.type === "success" && <CheckCircle2 className="h-6 w-6 shrink-0 text-positive" />}
          {t.type === "error" && <XCircle className="h-6 w-6 shrink-0 text-negative" />}
          {t.type === "info" && <Info className="h-6 w-6 shrink-0 text-brand" />}
          <span className="text-ink">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="ml-1 text-ink-dim transition-colors hover:text-ink"
            aria-label="알림 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
