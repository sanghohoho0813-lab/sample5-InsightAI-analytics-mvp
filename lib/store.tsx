"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDemoDataset, getDemoDatasets } from "./demo-data";
import { buildReport, keyFinding } from "./report";
import { AnalysisRecord, AppSettings, DemoDataset, Filters, SavedReport } from "./types";

export interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; href: string };
}

interface AppState {
  /** localStorage 복원이 끝났는지 — 끝나기 전에는 빈 상태를 그리지 않는다 */
  ready: boolean;
  dataset: DemoDataset | null;
  analyzing: boolean;
  analysisStep: number;
  filters: Filters;
  settings: AppSettings;
  history: AnalysisRecord[];
  reports: SavedReport[];
  toasts: ToastMsg[];
  readIds: string[];
  setFilters: (f: Partial<Filters>) => void;
  setPreset: (preset: "7" | "30" | "90") => void;
  setCustomRange: (start: string, end: string) => void;
  resetFilters: () => void;
  startAnalysis: (dataset: DemoDataset, navigateTo?: string) => void;
  openAnalysis: (record: AnalysisRecord) => void;
  saveReport: (title?: string) => SavedReport | null;
  deleteReport: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  resetDemo: () => void;
  showToast: (message: string, type?: ToastMsg["type"], action?: ToastMsg["action"]) => void;
  dismissToast: (id: number) => void;
  markRead: (ids: string[]) => void;
}

const Ctx = createContext<AppState | null>(null);

export const ANALYSIS_STEPS = [
  "데이터 구조 확인",
  "지표 집계 · 이전 기간 비교",
  "이상치 탐지 · 인사이트 정리",
];

/** 모든 저장 키는 이 접두어를 쓴다 — 데모 초기화 시 한 번에 지운다. */
const PREFIX = "insightai.";
const KEYS = {
  history: `${PREFIX}history`,
  active: `${PREFIX}activeDataset`,
  read: `${PREFIX}readNotifications`,
  reports: `${PREFIX}reports`,
  settings: `${PREFIX}settings`,
  uploads: `${PREFIX}uploads`,
};

const MAX_UPLOADS = 3;
const DEFAULT_SETTINGS: AppSettings = { defaultPreset: "30" };

const filtersFor = (preset: AppSettings["defaultPreset"]): Filters => ({
  preset,
  rangeDays: Number(preset),
  channel: "all",
  product: "all",
});

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** 업로드 원본 보관 — 최근 3개까지, 용량 초과 시 오래된 것부터 비운다. */
function storeUpload(ds: DemoDataset): boolean {
  let list = readJson<DemoDataset[]>(KEYS.uploads, []).filter((d) => d.id !== ds.id);
  list = [ds, ...list].slice(0, MAX_UPLOADS);
  while (list.length > 0) {
    if (writeJson(KEYS.uploads, list)) return list.some((d) => d.id === ds.id);
    list = list.slice(0, -1);
  }
  return false;
}

export function findDataset(id: string): DemoDataset | null {
  if (id.startsWith("demo-")) return getDemoDataset(id) ?? null;
  return readJson<DemoDataset[]>(KEYS.uploads, []).find((d) => d.id === id) ?? null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [dataset, setDataset] = useState<DemoDataset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [filters, setFiltersState] = useState<Filters>(filtersFor(DEFAULT_SETTINGS.defaultPreset));
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const s = { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(KEYS.settings, {}) };
    setSettings(s);
    setFiltersState(filtersFor(s.defaultPreset));
    setHistory(readJson<AnalysisRecord[]>(KEYS.history, []));
    setReports(readJson<SavedReport[]>(KEYS.reports, []));
    setReadIds(readJson<string[]>(KEYS.read, []));
    const active = readJson<{ id?: string } | null>(KEYS.active, null);
    const restored = active?.id ? findDataset(active.id) : null;
    // 어느 주소로 처음 들어와도 빈 화면이 아니도록 기본 샘플 데이터를 연결한다.
    setDataset(restored ?? getDemoDatasets()[0]);
    setReady(true);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastMsg["type"] = "info", action?: ToastMsg["action"]) => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t.slice(-2), { id, message, type, action }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 6000 : 3600);
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const setPreset = useCallback((preset: "7" | "30" | "90") => {
    setFiltersState((prev) => ({ ...prev, preset, rangeDays: Number(preset), range: undefined }));
  }, []);

  const setCustomRange = useCallback((start: string, end: string) => {
    const days = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
    setFiltersState((prev) => ({ ...prev, preset: "custom", range: { start, end }, rangeDays: Math.max(1, days) }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(filtersFor(settings.defaultPreset));
  }, [settings.defaultPreset]);

  const markRead = useCallback((ids: string[]) => {
    setReadIds((prev) => {
      const next = Array.from(new Set([...prev, ...ids])).slice(-300);
      writeJson(KEYS.read, next);
      return next;
    });
  }, []);

  const activate = useCallback((ds: DemoDataset) => {
    setDataset(ds);
    writeJson(KEYS.active, { id: ds.id });
  }, []);

  const startAnalysis = useCallback(
    (ds: DemoDataset, navigateTo = "/dashboard") => {
      timers.current.forEach(clearTimeout);
      setAnalyzing(true);
      setAnalysisStep(0);
      // 실제 계산은 즉시 끝나지만, 어떤 단계를 거치는지 보여주기 위해 짧게 단계 표시를 한다.
      timers.current = [
        setTimeout(() => setAnalysisStep(1), 500),
        setTimeout(() => setAnalysisStep(2), 1000),
        setTimeout(() => {
          const isUpload = !ds.id.startsWith("demo-");
          const restorable = isUpload ? storeUpload(ds) : true;
          const nextFilters = filtersFor(settings.defaultPreset);
          activate(ds);
          setFiltersState(nextFilters);
          const record: AnalysisRecord = {
            id: `an-${Date.now().toString(36)}`,
            name: `${ds.name} 분석`,
            datasetName: ds.name,
            datasetId: ds.id,
            createdAt: new Date().toISOString(),
            ...keyFinding(ds, nextFilters),
            status: "completed",
            source: isUpload ? "upload" : "demo",
            restorable,
          };
          setHistory((prev) => {
            const next = [record, ...prev].slice(0, 20);
            writeJson(KEYS.history, next);
            return next;
          });
          setAnalyzing(false);
          router.push(navigateTo);
          showToast(
            restorable
              ? `'${ds.name}' 분석을 마쳤습니다.`
              : "분석을 마쳤습니다. 파일이 커서 브라우저에 보관하지 못해, 나중에 다시 열려면 재업로드가 필요합니다.",
            "success"
          );
        }, 1500),
      ];
    },
    [router, showToast, activate, settings.defaultPreset]
  );

  const openAnalysis = useCallback(
    (record: AnalysisRecord) => {
      const ds = findDataset(record.datasetId);
      if (!ds) {
        showToast("원본 파일이 브라우저에 남아 있지 않습니다. 데이터 화면에서 다시 업로드해주세요.", "error");
        return;
      }
      activate(ds);
      setFiltersState(filtersFor(settings.defaultPreset));
      router.push("/dashboard");
      showToast(`'${record.datasetName}' 분석을 다시 열었습니다.`, "info");
    },
    [router, showToast, activate, settings.defaultPreset]
  );

  const saveReport = useCallback(
    (title?: string) => {
      if (!dataset) return null;
      const report = buildReport(dataset, filters, title);
      setReports((prev) => {
        const next = [report, ...prev].slice(0, 30);
        if (!writeJson(KEYS.reports, next)) writeJson(KEYS.reports, next.slice(0, 10));
        return next;
      });
      showToast("보고서를 저장했습니다.", "success", { label: "보고서 열기", href: `/reports?id=${report.id}` });
      return report;
    },
    [dataset, filters, showToast]
  );

  const deleteReport = useCallback(
    (id: string) => {
      setReports((prev) => {
        const next = prev.filter((r) => r.id !== id);
        writeJson(KEYS.reports, next);
        return next;
      });
      showToast("보고서를 삭제했습니다.", "info");
    },
    [showToast]
  );

  const updateSettings = useCallback(
    (s: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...s };
        writeJson(KEYS.settings, next);
        return next;
      });
      // 기본 기간을 바꾸면 지금 보고 있는 화면에도 바로 적용한다.
      if (s.defaultPreset) setPreset(s.defaultPreset);
    },
    [setPreset]
  );

  const resetDemo = useCallback(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // 저장소 접근 불가 환경 무시
    }
    setSettings(DEFAULT_SETTINGS);
    setFiltersState(filtersFor(DEFAULT_SETTINGS.defaultPreset));
    setHistory([]);
    setReports([]);
    setReadIds([]);
    activate(getDemoDatasets()[0]);
    router.push("/dashboard");
    showToast("데모를 처음 상태로 되돌렸습니다.", "success");
  }, [activate, router, showToast]);

  const value = useMemo<AppState>(
    () => ({
      ready,
      dataset,
      analyzing,
      analysisStep,
      filters,
      settings,
      history,
      reports,
      toasts,
      readIds,
      setFilters,
      setPreset,
      setCustomRange,
      resetFilters,
      startAnalysis,
      openAnalysis,
      saveReport,
      deleteReport,
      updateSettings,
      resetDemo,
      showToast,
      dismissToast,
      markRead,
    }),
    [ready, dataset, analyzing, analysisStep, filters, settings, history, reports, toasts, readIds,
     setFilters, setPreset, setCustomRange, resetFilters, startAnalysis, openAnalysis, saveReport,
     deleteReport, updateSettings, resetDemo, showToast, dismissToast, markRead]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
