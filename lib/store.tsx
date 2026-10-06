"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDemoDatasets } from "./demo-data";
import {
  KEYS,
  clearAll,
  findDataset,
  isValidRecord,
  isValidReport,
  readJson,
  readList,
  readUploads,
  sameFile,
  storeUpload,
  writeJson,
} from "./persist";
import { buildReport, keyFinding } from "./report";
import { AnalysisRecord, AppSettings, DemoDataset, Filters, SavedReport } from "./types";

export interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  action?: { label: string; href?: string; onClick?: () => void };
}

/** 인사이트·이상치에서 분석 화면으로 들어간 맥락 — 돌아갈 때 이전 범위를 되돌린다. */
export interface Drill {
  /** 출발한 화면 경로와 이름 */
  from: string;
  fromLabel: string;
  /** 무엇을 보러 왔는지 한 줄 */
  label: string;
  /** 표시할 날짜(이상치 발생일) */
  date?: string;
  prevFilters: Filters;
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
  renameReport: (id: string, title: string) => void;
  drill: Drill | null;
  beginDrill: (d: Omit<Drill, "prevFilters">) => void;
  /** restore=true면 출발 전 범위로 되돌린다 */
  endDrill: (restore: boolean) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  resetDemo: () => void;
  /** 브라우저에 보관된 업로드 파일(최근 3개) */
  uploads: DemoDataset[];
  /** 분석 과정 없이 다른 데이터셋으로 바로 전환 (헤더 데이터 선택) */
  switchDataset: (ds: DemoDataset) => void;
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

const DEFAULT_SETTINGS: AppSettings = { defaultPreset: "30" };

const filtersFor = (preset: AppSettings["defaultPreset"]): Filters => ({
  preset,
  rangeDays: Number(preset),
  channel: "all",
  product: "all",
});

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
  const [uploads, setUploads] = useState<DemoDataset[]>([]);
  const [drill, setDrill] = useState<Drill | null>(null);
  const lastSave = useRef<{ sig: string; at: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const s = { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>(KEYS.settings, {}) };
    setSettings(s);
    setFiltersState(filtersFor(s.defaultPreset));
    setHistory(readList<AnalysisRecord>(KEYS.history, isValidRecord));
    setReports(readList<SavedReport>(KEYS.reports, isValidReport));
    setReadIds(readList<string>(KEYS.read, (x) => typeof x === "string"));
    setUploads(readUploads());
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
    (input: DemoDataset, navigateTo = "/dashboard") => {
      timers.current.forEach(clearTimeout);
      setAnalyzing(true);
      setAnalysisStep(0);
      // 실제 계산은 즉시 끝나지만, 어떤 단계를 거치는지 보여주기 위해 짧게 단계 표시를 한다.
      timers.current = [
        setTimeout(() => setAnalysisStep(1), 500),
        setTimeout(() => setAnalysisStep(2), 1000),
        setTimeout(() => {
          const isUpload = !input.id.startsWith("demo-");
          // 같은 파일을 다시 올렸으면 예전 id를 이어 써서 이전 분석 기록도 계속 열리게 한다.
          const same = isUpload
            ? readUploads().find((d) => sameFile(d, input))
            : undefined;
          const ds = same ? { ...input, id: same.id } : input;
          const restorable = isUpload ? storeUpload(ds) : true;
          if (isUpload) setUploads(readUploads());
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
      // 연속 클릭으로 같은 보고서가 두 번 저장되지 않게 막는다.
      if (lastSave.current && lastSave.current.sig === report.signature && Date.now() - lastSave.current.at < 1500) return null;
      lastSave.current = { sig: report.signature, at: Date.now() };
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

  const persistReports = useCallback((next: SavedReport[]) => {
    setReports(next);
    writeJson(KEYS.reports, next);
  }, []);

  const deleteReport = useCallback(
    (id: string) => {
      const before = reports;
      const removed = before.find((r) => r.id === id);
      if (!removed) return;
      persistReports(before.filter((r) => r.id !== id));
      // 실수로 지웠을 때 바로 되돌릴 수 있게 한다.
      showToast(`'${removed.title}'을(를) 삭제했습니다.`, "info", {
        label: "되돌리기",
        onClick: () => persistReports(before),
      });
    },
    [reports, persistReports, showToast]
  );

  const renameReport = useCallback(
    (id: string, title: string) => {
      const t = title.trim();
      if (!t) return;
      persistReports(reports.map((r) => (r.id === id ? { ...r, title: t } : r)));
    },
    [reports, persistReports]
  );

  const beginDrill = useCallback(
    (d: Omit<Drill, "prevFilters">) => {
      // 이미 드릴 중이면 처음 출발점과 범위를 유지하고, 보고 있는 대상만 바꾼다.
      setDrill((cur) => (cur ? { ...cur, label: d.label, date: d.date } : { ...d, prevFilters: filters }));
    },
    [filters]
  );

  const endDrill = useCallback(
    (restore: boolean) => {
      if (drill && restore) setFiltersState(drill.prevFilters);
      setDrill(null);
    },
    [drill]
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

  const switchDataset = useCallback(
    (ds: DemoDataset) => {
      activate(ds);
      setDrill(null);
      setFiltersState(filtersFor(settings.defaultPreset));
      showToast(`'${ds.name}'(으)로 바꿨습니다.`, "info");
    },
    [activate, settings.defaultPreset, showToast]
  );

  const resetDemo = useCallback(() => {
    clearAll();
    setSettings(DEFAULT_SETTINGS);
    setFiltersState(filtersFor(DEFAULT_SETTINGS.defaultPreset));
    setHistory([]);
    setReports([]);
    setReadIds([]);
    setUploads([]);
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
      renameReport,
      drill,
      beginDrill,
      endDrill,
      updateSettings,
      resetDemo,
      uploads,
      switchDataset,
      showToast,
      dismissToast,
      markRead,
    }),
    [ready, dataset, analyzing, analysisStep, filters, settings, history, reports, toasts, readIds,
     setFilters, setPreset, setCustomRange, resetFilters, startAnalysis, openAnalysis, saveReport,
     deleteReport, renameReport, drill, beginDrill, endDrill, updateSettings, resetDemo, uploads, switchDataset, showToast, dismissToast, markRead]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
