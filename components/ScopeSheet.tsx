"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { resolveDates, uniqueDates } from "@/lib/analytics-engine";
import { canSplit } from "@/lib/dataset-meta";
import { btn, field } from "@/lib/ui";
import { DemoDataset, Filters } from "@/lib/types";
import Select from "./Select";

const PRESETS = [
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
  { value: "90", label: "90일" },
  { value: "custom", label: "직접" },
] as const;

const short = (d: string) => d.slice(5).replace("-", ".");

/**
 * 모바일 분석 범위 — 한 줄 요약 버튼을 누르면 아래에서 시트가 올라온다.
 * 기간·채널·상품을 한 번에 고르고 '적용'으로 반영한다.
 */
export default function ScopeSheet({ dataset, showPeriod = true }: { dataset: DemoDataset; showPeriod?: boolean }) {
  const { filters, settings, setFilters, setPreset, setCustomRange, resetFilters } = useApp();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ preset: Filters["preset"]; start: string; end: string; channel: string; product: string }>({
    preset: filters.preset,
    start: "",
    end: "",
    channel: filters.channel,
    product: filters.product,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const showChannel = canSplit(dataset, "channel");
  const showProduct = canSplit(dataset, "product");

  const bounds = useMemo(() => {
    const d = uniqueDates(dataset.rows);
    return { min: d[0] ?? "", max: d[d.length - 1] ?? "" };
  }, [dataset]);
  const current = useMemo(() => resolveDates(dataset.rows, filters).currentDates, [dataset, filters]);

  const summary = [
    showPeriod
      ? filters.preset === "custom"
        ? `${short(current[0] ?? "")}–${short(current[current.length - 1] ?? "")}`
        : `최근 ${filters.preset}일`
      : null,
    showChannel ? (filters.channel === "all" ? "전체 채널" : filters.channel) : null,
    showProduct && filters.product !== "all" ? filters.product : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const changed =
    (showChannel && filters.channel !== "all") ||
    (showProduct && filters.product !== "all") ||
    (showPeriod && filters.preset !== settings.defaultPreset);

  const openSheet = () => {
    setDraft({
      preset: filters.preset,
      start: current[0] ?? bounds.min,
      end: current[current.length - 1] ?? bounds.max,
      channel: filters.channel,
      product: filters.product,
    });
    setOpen(true);
  };

  // 열려 있는 동안: 배경 스크롤 잠금, Esc로 닫기, 떠 있는 뒤로·앞으로 버튼 숨김
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("sheet-open");
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      // Tab 이동이 시트 밖으로 빠져나가지 않게 한다.
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), select, input");
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("sheet-open");
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const error =
    draft.preset !== "custom"
      ? null
      : !draft.start || !draft.end
        ? "시작일과 종료일을 모두 고르세요."
        : draft.start > draft.end
          ? "시작일이 종료일보다 늦습니다."
          : null;

  const apply = () => {
    if (error) return;
    if (showPeriod) {
      if (draft.preset === "custom") setCustomRange(draft.start, draft.end);
      else setPreset(draft.preset);
    }
    setFilters({ channel: draft.channel, product: draft.product });
    setOpen(false);
  };

  if (!showPeriod && !showChannel && !showProduct) return null;

  return (
    <div className="mb-6 sm:hidden">
      <button
        onClick={openSheet}
        aria-haspopup="dialog"
        className={`${field} flex w-full items-center gap-2 ${changed ? "border-brand/60 text-brand" : ""}`}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{summary}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-[95]" role="presentation">
          <div className="animate-fade-in absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden />
          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="scope-sheet-title"
            className="animate-fade-up absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-panel bg-surface px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3 shadow-overlay outline-none"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            <div className="flex items-center justify-between">
              <h2 id="scope-sheet-title" className="text-card font-bold text-ink">
                분석 범위
              </h2>
              <button onClick={() => setOpen(false)} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink-dim" aria-label="닫기">
                <X className="h-5 w-5" />
              </button>
            </div>

            {showPeriod && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-meta font-semibold text-ink-soft">기간</legend>
                <div className="grid grid-cols-4 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setDraft((d) => ({ ...d, preset: p.value }))}
                      aria-pressed={draft.preset === p.value}
                      className={`min-h-11 rounded-control border text-sub font-semibold transition-colors ${
                        draft.preset === p.value ? "border-brand bg-brand-soft text-brand" : "border-line text-ink-soft"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {draft.preset === "custom" && (
                  <div className="mt-3">
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
                        className={`${field} w-full px-2`}
                      />
                    </div>
                    {error && (
                      <p className="mt-2 text-caption text-negative" role="alert">
                        {error}
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            )}

            {showChannel && (
              <div className="mt-5">
                <p className="mb-2 text-meta font-semibold text-ink-soft">채널</p>
                <Select
                  label="채널"
                  value={draft.channel}
                  onChange={(v) => setDraft((d) => ({ ...d, channel: v }))}
                  options={[{ value: "all", label: "전체 채널" }, ...dataset.channels.map((c) => ({ value: c, label: c }))]}
                />
              </div>
            )}
            {showProduct && (
              <div className="mt-5">
                <p className="mb-2 text-meta font-semibold text-ink-soft">상품</p>
                <Select
                  label="상품"
                  value={draft.product}
                  onChange={(v) => setDraft((d) => ({ ...d, product: v }))}
                  options={[{ value: "all", label: "전체 상품" }, ...dataset.products.map((p) => ({ value: p, label: p }))]}
                />
              </div>
            )}

            <div className="mt-6 grid grid-cols-[auto_1fr] gap-2">
              <button
                onClick={() => {
                  resetFilters();
                  setOpen(false);
                }}
                className={btn.secondary}
              >
                초기화
              </button>
              <button onClick={apply} disabled={!!error} className={btn.primary}>
                적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
