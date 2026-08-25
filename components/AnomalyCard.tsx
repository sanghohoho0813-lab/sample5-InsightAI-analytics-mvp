"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, AlertTriangle, ArrowRight, ChevronDown, Info } from "lucide-react";
import { Anomaly } from "@/lib/types";
import { formatDateKR } from "@/lib/format";
import { useApp } from "@/lib/store";

const SEVERITY = {
  critical: { icon: AlertOctagon, color: "text-negative", bg: "bg-negative-soft", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning-soft", label: "Warning" },
  info: { icon: Info, color: "text-brand", bg: "bg-brand-soft", label: "Info" },
} as const;

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 이상징후 카드 — 클릭 시 상세 근거 확장 + 해당 시점 차트로 드릴다운 */
export default function AnomalyCard({ anomaly, delay = 0 }: { anomaly: Anomaly; delay?: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setCustomRange, showToast } = useApp();
  const s = SEVERITY[anomaly.severity];
  const Icon = s.icon;

  const drillDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 이상징후 발생일 전후 7일 구간으로 기간을 좁혀 분석 화면으로 이동
    setCustomRange(shiftDate(anomaly.date, -7), shiftDate(anomaly.date, 3));
    showToast(`${formatDateKR(anomaly.date)} 전후 구간으로 기간을 좁혔습니다.`, "info");
    router.push("/analytics");
  };

  return (
    <div
      className={`card card-hover animate-fade-up ${open ? "border-line-strong" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3.5 p-4.5 text-left"
      >
        <span className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
          <Icon className={`h-6 w-6 ${s.color}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-[20px] font-semibold text-ink">{anomaly.title}</span>
            <span className={`tabular shrink-0 text-[19.5px] font-bold ${anomaly.deltaPct >= 0 ? "text-positive" : "text-negative"}`}>
              {anomaly.deltaPct >= 0 ? "+" : ""}{anomaly.deltaPct.toFixed(0)}%
            </span>
          </span>
          <span className="mt-1 block text-[18px] leading-relaxed text-ink-soft">{anomaly.description}</span>
          <span className="mt-2 flex items-center gap-2 text-[16.5px] text-ink-dim">
            <span className={`rounded px-1.5 py-0.5 font-semibold ${s.bg} ${s.color}`}>{s.label}</span>
            <span className="tabular">{formatDateKR(anomaly.date)}</span>
            <ChevronDown className={`ml-auto h-5 w-5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </span>
        </span>
      </button>
      <div className={`grid px-3.5 transition-all duration-300 ${open ? "grid-rows-[1fr] pb-3.5 opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <p className="rounded-lg bg-surface-soft p-3 text-[18px] leading-relaxed text-ink-soft">{anomaly.detail}</p>
          <button
            onClick={drillDown}
            className="mt-2.5 flex items-center gap-1 text-[19px] font-semibold text-brand transition-colors hover:text-brand-dark"
          >
            이 시점 분석 보기 <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
