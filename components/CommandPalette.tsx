"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CornerDownLeft, Database, FileText, Plus, Search, Upload, type LucideIcon } from "lucide-react";
import { useApp } from "@/lib/store";
import { ALL_NAV } from "@/lib/nav";
import { anomaliesFor } from "@/lib/dataset-meta";
import { getDemoDatasets } from "@/lib/demo-data";
import { investigationHref } from "@/lib/drill";
import { whenText } from "./AnomalyList";
import { SEVERITY_META } from "@/lib/ui";

/** 상단 바의 버튼 등 어디서든 이 이벤트로 연다 */
export const PALETTE_EVENT = "insightai:palette";
export const openPalette = () => window.dispatchEvent(new Event(PALETTE_EVENT));

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  /** 찾기에 함께 쓰는 말(화면 설명·데이터 이름 등) */
  keywords?: string;
  run: () => void;
}

/**
 * 빠른 이동 (Ctrl/⌘ + K) — 화면 · 평소와 달랐던 날 · 저장한 보고서 · 데이터 · 자주 하는 일을 한 곳에서 찾아 바로 간다.
 * 키보드만으로 쓸 수 있게 ↑↓로 고르고 Enter로 실행, Esc로 닫는다.
 */
export default function CommandPalette() {
  const router = useRouter();
  const { dataset, filters, reports, uploads, switchDataset, saveReport } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setQ("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) setOpen(false);
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, show);
    };
  }, [open]);

  // 열려 있는 동안 배경 스크롤과 떠 있는 공용 버튼을 숨기고, 닫으면 연 자리로 초점을 돌려준다.
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("sheet-open");
    inputRef.current?.focus();
    const back = returnFocus.current;
    return () => {
      document.body.classList.remove("sheet-open");
      back?.focus?.();
    };
  }, [open]);

  const items = useMemo<Item[]>(() => {
    if (!open) return [];
    const go = (href: string) => () => router.push(href);
    const list: Item[] = ALL_NAV.map((n) => ({ id: `nav-${n.href}`, group: "화면", label: n.label, hint: n.hint, icon: n.icon, keywords: n.hint, run: go(n.href) }));
    list.push(
      { id: "act-save", group: "자주 하는 일", label: "지금 범위로 보고서 저장", icon: Plus, keywords: "보고서 저장 기록 PDF", run: () => saveReport() },
      { id: "act-upload", group: "자주 하는 일", label: "내 파일 올리기", hint: "CSV · XLSX", icon: Upload, keywords: "업로드 파일 CSV 엑셀", run: go("/data") }
    );
    if (dataset) {
      for (const a of anomaliesFor(dataset, filters).slice(0, 8)) {
        list.push({
          id: `an-${a.id}`,
          group: "평소와 달랐던 날",
          label: a.title,
          hint: `${SEVERITY_META[a.severity].label} · ${whenText(a)}`,
          icon: AlertTriangle,
          keywords: `${a.channel ?? ""} ${a.detail}`,
          run: go(investigationHref(a.id)),
        });
      }
    }
    for (const r of reports.slice(0, 8)) {
      list.push({ id: `rp-${r.id}`, group: "저장한 보고서", label: r.title, hint: r.headline, icon: FileText, keywords: r.datasetName, run: go(`/reports?id=${r.id}`) });
    }
    for (const ds of [...getDemoDatasets(), ...uploads]) {
      const now = dataset?.id === ds.id;
      list.push({
        id: `ds-${ds.id}`,
        group: "데이터 바꾸기",
        label: ds.name,
        hint: now ? "지금 보는 데이터" : ds.category,
        icon: Database,
        keywords: ds.description,
        run: () => (now ? router.push("/dashboard") : switchDataset(ds)),
      });
    }
    return list;
  }, [open, dataset, filters, reports, uploads, router, saveReport, switchDataset]);

  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return items;
    return items.filter((it) => {
      const hay = `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""} ${it.group}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [items, q]);

  // 고른 줄이 보이도록 스크롤
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (it: Item | undefined) => {
    if (!it) return;
    setOpen(false);
    it.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(shown[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "Tab") {
      // 대화상자 안에서는 입력 칸 하나만 초점을 받는다
      e.preventDefault();
    }
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-start justify-center px-3 pt-[8vh] sm:pt-[12vh]" role="presentation">
      <div className="animate-fade-in absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="빠른 이동"
        className="animate-fade-up relative flex max-h-[76vh] w-full max-w-[600px] flex-col overflow-hidden rounded-panel bg-surface shadow-overlay"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={shown[active] ? `pal-${shown[active].id}` : undefined}
            aria-autocomplete="list"
            aria-label="화면·변화·보고서·데이터 찾기"
            placeholder="화면, 평소와 달랐던 날, 보고서, 데이터 찾기"
            autoComplete="off"
            spellCheck={false}
            className="no-ring h-14 min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-dim"
          />
          <kbd className="hidden rounded-[6px] border border-line-strong bg-surface-soft px-1.5 py-0.5 text-caption font-semibold text-ink-dim sm:block">Esc</kbd>
        </div>

        <ul id="palette-list" ref={listRef} role="listbox" aria-label="찾은 항목" className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
          {shown.length === 0 && (
            <li className="px-4 py-10 text-center text-sub text-ink-dim" role="presentation">
              ‘{q.trim()}’에 맞는 항목이 없습니다.
            </li>
          )}
          {shown.map((it, i) => {
            const Icon = it.icon;
            const head = i === 0 || shown[i - 1].group !== it.group;
            const on = i === active;
            return (
              <li key={it.id} role="presentation">
                {head && (
                  <p className="px-4 pb-1 pt-3 text-caption font-semibold text-ink-dim first:pt-1" aria-hidden>
                    {it.group}
                  </p>
                )}
                <div
                  id={`pal-${it.id}`}
                  role="option"
                  aria-selected={on}
                  data-index={i}
                  onMouseMove={() => !on && setActive(i)}
                  onClick={() => run(it)}
                  className={`mx-2 flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 ${on ? "bg-brand-soft" : ""}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${on ? "bg-surface text-brand" : "bg-surface-soft text-ink-soft"}`}
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sub font-semibold ${on ? "text-brand" : "text-ink"}`}>{it.label}</span>
                    {it.hint && <span className="block truncate text-meta text-ink-dim">{it.hint}</span>}
                  </span>
                  {on && <CornerDownLeft className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="hidden gap-4 border-t border-line bg-surface-soft px-4 py-2 text-caption text-ink-dim sm:flex" aria-hidden>
          <span>↑↓ 고르기</span>
          <span>Enter 이동</span>
          <span>Esc 닫기</span>
        </p>
      </div>
    </div>
  );
}
