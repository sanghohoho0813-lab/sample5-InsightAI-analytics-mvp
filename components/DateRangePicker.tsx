"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useApp } from "@/lib/store";
import { resolveDates, uniqueDates } from "@/lib/analytics-engine";
import { usePopover } from "@/lib/use-popover";
import { btn, field } from "@/lib/ui";
import { formatDateKR } from "@/lib/format";
import { DemoDataset } from "@/lib/types";

const PRESETS: { value: "7" | "30" | "90"; label: string }[] = [
  { value: "7", label: "최근 7일" },
  { value: "30", label: "최근 30일" },
  { value: "90", label: "최근 90일" },
];

const short = (d: string) => d.slice(5).replace("-", ".");

/** 기간 선택 — 버튼에는 '최근 30일'처럼 뜻을 먼저, 실제 날짜는 보조로 보여준다. */
export default function DateRangePicker({ dataset }: { dataset: DemoDataset }) {
  const { filters, setPreset, setCustomRange } = useApp();
  const { open, setOpen, ref } = usePopover<HTMLDivElement>();
  const [draft, setDraft] = useState({ start: "", end: "" });

  const bounds = useMemo(() => {
    const dates = uniqueDates(dataset.rows);
    return { min: dates[0] ?? "", max: dates[dates.length - 1] ?? "" };
  }, [dataset]);

  const current = useMemo(() => resolveDates(dataset.rows, filters).currentDates, [dataset, filters]);
  const range = current.length ? `${short(current[0])} – ${short(current[current.length - 1])}` : "";
  const primary = filters.preset === "custom" ? range || "기간 선택" : PRESETS.find((p) => p.value === filters.preset)?.label;

  // 열 때마다 지금 범위로 입력값을 맞춘다.
  useEffect(() => {
    if (open) setDraft({ start: current[0] ?? bounds.min, end: current[current.length - 1] ?? bounds.max });
  }, [open, current, bounds]);

  const error =
    !draft.start || !draft.end
      ? "시작일과 종료일을 모두 고르세요."
      : draft.start > draft.end
        ? "시작일이 종료일보다 늦습니다."
        : draft.start < bounds.min || draft.end > bounds.max
          ? "데이터가 있는 기간 안에서 골라주세요."
          : null;

  const apply = () => {
    if (error) return;
    setCustomRange(draft.start, draft.end);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`기간: ${primary}${filters.preset !== "custom" && range ? ` (${range})` : ""}`}
        className={`${field} flex w-full items-center gap-2 sm:w-auto`}
      >
        <CalendarDays className="hidden h-4 w-4 shrink-0 text-ink-dim sm:block" aria-hidden />
        <span className="truncate">{primary}</span>
        {filters.preset !== "custom" && range && (
          <span className="tabular hidden whitespace-nowrap text-meta font-normal text-ink-dim sm:inline">{range}</span>
        )}
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="기간 선택"
          className="card animate-fade-in absolute left-0 z-50 mt-2 w-[min(320px,calc(100vw-32px))] p-4 shadow-overlay"
        >
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPreset(p.value);
                  setOpen(false);
                }}
                aria-pressed={filters.preset === p.value}
                className={`min-h-11 rounded-control border px-2 text-meta font-semibold transition-colors ${
                  filters.preset === p.value
                    ? "border-brand bg-brand-soft text-brand"
                    : "border-line text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <p className="mb-2 mt-5 text-caption font-semibold text-ink-dim">직접 선택</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={draft.start}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
              aria-label="시작일"
              aria-invalid={!!error}
              className={`${field} w-full px-2`}
            />
            <span className="text-ink-dim" aria-hidden>
              ~
            </span>
            <input
              type="date"
              value={draft.end}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
              aria-label="종료일"
              aria-invalid={!!error}
              className={`${field} w-full px-2`}
            />
          </div>
          <p className={`mt-2 text-caption ${error ? "text-negative" : "text-ink-dim"}`} role={error ? "alert" : undefined}>
            {error ?? `데이터 기간 ${formatDateKR(bounds.min)} ~ ${formatDateKR(bounds.max)}`}
          </p>
          <button onClick={apply} disabled={!!error} className={`${btn.primary} mt-4 w-full`}>
            이 기간으로 보기
          </button>
        </div>
      )}
    </div>
  );
}
