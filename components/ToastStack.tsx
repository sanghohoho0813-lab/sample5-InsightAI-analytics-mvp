"use client";

import { useApp } from "@/lib/store";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

export default function ToastStack() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[90] flex flex-col gap-2 max-w-[90vw]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card animate-fade-up flex items-center gap-3 px-4 py-3 text-sm shadow-xl shadow-black/40"
        >
          {t.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" />}
          {t.type === "error" && <XCircle className="h-4 w-4 shrink-0 text-negative" />}
          {t.type === "info" && <Info className="h-4 w-4 shrink-0 text-accent" />}
          <span className="text-ink">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="ml-1 text-ink-dim hover:text-ink"
            aria-label="닫기"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
