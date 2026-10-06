"use client";

import Link from "next/link";
import { Check, ChevronDown, Upload } from "lucide-react";
import { useApp } from "@/lib/store";
import { getDemoDatasets } from "@/lib/demo-data";
import { usePopover } from "@/lib/use-popover";
import { DemoDataset } from "@/lib/types";

/** 헤더의 '지금 보는 데이터' — 눌러서 샘플·업로드 파일 사이를 바로 바꾼다. */
export default function DatasetSwitcher({ className = "" }: { className?: string }) {
  const { ready, dataset, uploads, switchDataset } = useApp();
  const { open, setOpen, ref } = usePopover<HTMLDivElement>();
  const demos = getDemoDatasets();

  const pick = (ds: DemoDataset) => {
    setOpen(false);
    if (ds.id !== dataset?.id) switchDataset(ds);
  };

  const item = (ds: DemoDataset, hint: string) => {
    const on = ds.id === dataset?.id;
    return (
      <li key={ds.id}>
        <button
          role="menuitemradio"
          aria-checked={on}
          onClick={() => pick(ds)}
          className={`flex min-h-12 w-full items-center gap-3 rounded-control px-3 text-left transition-colors hover:bg-surface-soft ${on ? "bg-brand-soft/60" : ""}`}
        >
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-sub font-semibold ${on ? "text-brand" : "text-ink"}`}>{ds.name}</span>
            <span className="block truncate text-caption text-ink-dim">{hint}</span>
          </span>
          {on && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
        </button>
      </li>
    );
  };

  // 저장된 상태를 불러오기 전에는 '데이터 선택'이 잠깐 보이지 않도록 자리만 잡는다.
  if (!ready) {
    return (
      <div className={`min-w-0 px-2 ${className}`} aria-hidden>
        <div className="skeleton h-5 w-36" />
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`분석 데이터 바꾸기 — 지금 ${dataset?.name ?? "없음"}`}
        className="flex h-10 max-w-full items-center gap-2 rounded-control px-2 text-left transition-colors hover:bg-surface"
      >
        <span className="truncate text-sub font-semibold text-ink">{dataset?.name ?? "데이터 선택"}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="분석 데이터"
          className="card animate-fade-in absolute left-0 z-50 mt-1 w-[min(320px,calc(100vw-32px))] p-2 shadow-overlay"
        >
          <p className="px-3 pb-1 pt-2 text-caption font-semibold text-ink-dim">샘플 데이터</p>
          <ul>
            {demos.map((ds) => item(ds, ds.category))}
          </ul>
          {uploads.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-3 text-caption font-semibold text-ink-dim">올린 파일</p>
              <ul>
                {uploads.map((ds) => item(ds, `${ds.rows.length.toLocaleString("ko-KR")}행 · ${ds.periodLabel}`))}
              </ul>
            </>
          )}
          <div className="mt-2 border-t border-line pt-2">
            <Link
              href="/data"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-control px-3 text-sub font-semibold text-brand hover:bg-surface-soft"
            >
              <Upload className="h-4 w-4" aria-hidden /> 내 파일 올리기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
