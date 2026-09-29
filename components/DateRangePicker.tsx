"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useApp } from "@/lib/store";
import { resolveDates, uniqueDates } from "@/lib/analytics-engine";
import { btn, field } from "@/lib/ui";
import { formatDateKR } from "@/lib/format";
import { DemoDataset } from "@/lib/types";

const PRESETS: { value: "7" | "30" | "90"; label: string }[] = [
  { value: "7", label: "최근 7일" },
  { value: "30", label: "최근 30일" },
  { value: "90", label: "최근 90일" },
];

/** 기간 선택기 — 프리셋 + 직접 선택(커스텀 구간) */
export default function DateRangePicker({ dataset }: { dataset: DemoDataset }) {
  const { filters, setPreset, setCustomRange, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ start: "", end: "" });
  const ref = useRef<HTMLDivElement>(null);

  const bounds = useMemo(() => {
    const dates = uniqueDates(dataset.rows);
    return { min: dates[0] ?? "", max: dates[dates.length - 1] ?? "" };
  }, [dataset]);

  const label = useMemo(() => {
    const { currentDates } = resolveDates(dataset.rows, filters);
    if (currentDates.length === 0) return "기간 선택";
    return `${formatDateKR(currentDates[0])} ~ ${formatDateKR(currentDates[currentDates.length - 1])}`;
  }, [dataset, filters]);

  // 모바일에서는 연도를 생략해 한 줄에 들어가게 한다.
  const shortLabel = useMemo(() => {
    const { currentDates } = resolveDates(dataset.rows, filters);
    if (currentDates.length === 0) return "기간 선택";
    const trim = (d: string) => d.slice(5).replace("-", ".");
    return `${trim(currentDates[0])} ~ ${trim(currentDates[currentDates.length - 1])}`;
  }, [dataset, filters]);

  useEffect(() => {
    if (!open) return;
    const { currentDates } = resolveDates(dataset.rows, filters);
    setDraft({
      start: currentDates[0] ?? bounds.min,
      end: currentDates[currentDates.length - 1] ?? bounds.max,
    });
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
  }, [open, dataset, filters, bounds]);

  const apply = () => {
    if (!draft.start || !draft.end) return;
    if (draft.start > draft.end) {
      showToast("시작일이 종료일보다 늦습니다. 기간을 다시 확인해주세요.", "error");
      return;
    }
    setCustomRange(draft.start, draft.end);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${field} flex w-full items-center gap-2 sm:w-auto`}
      >
        <CalendarDays className="h-4 w-4 text-ink-dim" aria-hidden />
        <span className="tabular hidden sm:inline">{label}</span>
        <span className="tabular sm:hidden">{shortLabel}</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="기간 선택"
          className="card animate-fade-in absolute left-0 z-50 mt-2 w-[min(320px,calc(100vw-32px))] p-4 shadow-overlay"
        >
          <p className="mb-2 text-caption font-semibold text-ink-dim">빠른 선택</p>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => {
                  setPreset(p.value);
                  setOpen(false);
                }}
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

          <p className="mb-2 mt-4 text-caption font-semibold text-ink-dim">직접 선택</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={draft.start}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))}
              aria-label="시작일"
              className={`${field} w-full px-2`}
            />
            <span className="text-ink-dim">~</span>
            <input
              type="date"
              value={draft.end}
              min={bounds.min}
              max={bounds.max}
              onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))}
              aria-label="종료일"
              className={`${field} w-full px-2`}
            />
          </div>
          <p className="mt-2 text-caption text-ink-dim">
            데이터 보유 기간 {formatDateKR(bounds.min)} ~ {formatDateKR(bounds.max)}
          </p>
          <button
            onClick={apply}
            className={`${btn.primary} mt-4 w-full`}
          >
            적용
          </button>
        </div>
      )}
    </div>
  );
}
