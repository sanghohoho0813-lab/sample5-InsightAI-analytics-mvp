"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, ChevronDown, Info } from "lucide-react";
import { Anomaly } from "@/lib/types";
import { formatDateKR } from "@/lib/format";

const SEVERITY_STYLE = {
  critical: { icon: AlertOctagon, color: "text-negative", bg: "bg-negative/12", ring: "border-negative/25", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/12", ring: "border-warning/25", label: "Warning" },
  info: { icon: Info, color: "text-accent-bright", bg: "bg-accent/12", ring: "border-accent/25", label: "Info" },
} as const;

/** 이상징후 카드 — 클릭 시 상세 근거 확장 */
export default function AnomalyCard({ anomaly, delay = 0 }: { anomaly: Anomaly; delay?: number }) {
  const [open, setOpen] = useState(false);
  const s = SEVERITY_STYLE[anomaly.severity];
  const Icon = s.icon;

  return (
    <button
      onClick={() => setOpen((o) => !o)}
      className={`card card-hover animate-fade-up w-full border p-3.5 text-left ${open ? s.ring : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
          <Icon className={`h-4 w-4 ${s.color}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold">{anomaly.title}</p>
            <span className={`tabular shrink-0 text-[12.5px] font-bold ${anomaly.deltaPct >= 0 ? "text-positive" : "text-negative"}`}>
              {anomaly.deltaPct >= 0 ? "+" : ""}{anomaly.deltaPct.toFixed(0)}%
            </span>
          </div>
          <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{anomaly.description}</p>
          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-dim">
            <span className={`rounded px-1.5 py-0.5 font-medium ${s.bg} ${s.color}`}>{s.label}</span>
            <span>{formatDateKR(anomaly.date)}</span>
            <ChevronDown className={`ml-auto h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
          </div>
          <div className={`grid transition-all duration-300 ${open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <p className="overflow-hidden text-[12px] leading-relaxed text-ink-dim">{anomaly.detail}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
