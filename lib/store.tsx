"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getDemoDataset, getDemoDatasets } from "./demo-data";
import { AnalysisRecord, DemoDataset, Filters } from "./types";

interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface AppState {
  dataset: DemoDataset | null;
  analyzed: boolean;
  analyzing: boolean;
  analysisStep: number;
  filters: Filters;
  history: AnalysisRecord[];
  toasts: ToastMsg[];
  setFilters: (f: Partial<Filters>) => void;
  startAnalysis: (dataset: DemoDataset, navigateTo?: string) => void;
  openAnalysis: (record: AnalysisRecord) => void;
  showToast: (message: string, type?: ToastMsg["type"]) => void;
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);

export const ANALYSIS_STEPS = [
  "데이터 구조를 확인하고 있습니다.",
  "이상 패턴을 찾고 있습니다.",
  "핵심 인사이트를 생성하고 있습니다.",
  "분석이 완료되었습니다.",
];

const HISTORY_KEY = "insightai.history";
const ACTIVE_KEY = "insightai.activeDataset";

/** 새로고침/직접 진입에도 분석 상태가 유지되도록 활성 데이터셋을 저장 */
function persistActiveDataset(ds: DemoDataset) {
  try {
    if (ds.id.startsWith("demo-")) {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify({ type: "demo", id: ds.id }));
    } else {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify({ type: "upload", dataset: ds }));
    }
  } catch {
    // 저장 공간 초과 등은 무시 (세션 내 메모리로만 유지)
  }
}

function restoreActiveDataset(): DemoDataset | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.type === "demo") return getDemoDataset(saved.id) ?? null;
    if (saved.type === "upload" && saved.dataset?.rows?.length) return saved.dataset as DemoDataset;
  } catch {
    // 손상된 데이터 무시
  }
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [dataset, setDataset] = useState<DemoDataset | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [filters, setFiltersState] = useState<Filters>({ rangeDays: 30, channel: "all", product: "all" });
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // 저장된 기록이 없거나 손상된 경우 무시
    }
    const restored = restoreActiveDataset();
    if (restored) {
      setDataset(restored);
      setAnalyzed(true);
    }
  }, []);

  const persistHistory = useCallback((records: AnalysisRecord[]) => {
    setHistory(records);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 20)));
    } catch {
      // localStorage 사용 불가 환경 무시
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastMsg["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const setFilters = useCallback((f: Partial<Filters>) => {
    setFiltersState((prev) => ({ ...prev, ...f }));
  }, []);

  const startAnalysis = useCallback(
    (ds: DemoDataset, navigateTo = "/dashboard") => {
      setAnalyzing(true);
      setAnalysisStep(0);
      // 분석 과정 연출: 단계별 메시지 (약 3초)
      const delays = [0, 900, 1800, 2600];
      delays.forEach((d, i) => setTimeout(() => setAnalysisStep(i), d));
      setTimeout(() => {
        setDataset(ds);
        setAnalyzed(true);
        persistActiveDataset(ds);
        setAnalyzing(false);
        setFiltersState({ rangeDays: 30, channel: "all", product: "all" });
        const record: AnalysisRecord = {
          id: `an-${Date.now()}`,
          name: `${ds.name} 분석`,
          datasetName: ds.name,
          datasetId: ds.id,
          createdAt: new Date().toISOString(),
          keyInsight: ds.id.startsWith("demo-")
            ? "채널 비중 변화와 성장 상품이 감지되었습니다."
            : "업로드 데이터에서 핵심 지표 변화를 감지했습니다.",
          status: "completed",
        };
        setHistory((prev) => {
          const next = [record, ...prev].slice(0, 20);
          try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
        router.push(navigateTo);
        showToast("분석이 완료되었습니다.", "success");
      }, 3300);
    },
    [router, showToast]
  );

  const openAnalysis = useCallback(
    (record: AnalysisRecord) => {
      const demo = getDemoDataset(record.datasetId);
      if (demo) {
        setDataset(demo);
        setAnalyzed(true);
        persistActiveDataset(demo);
        router.push("/dashboard");
        showToast(`'${record.datasetName}' 분석을 다시 불러왔습니다.`, "info");
      } else {
        showToast("업로드 데이터 분석은 세션이 종료되어 다시 불러올 수 없습니다. 파일을 다시 업로드해주세요.", "error");
      }
    },
    [router, showToast]
  );

  const value = useMemo<AppState>(
    () => ({
      dataset,
      analyzed,
      analyzing,
      analysisStep,
      filters,
      history,
      toasts,
      setFilters,
      startAnalysis,
      openAnalysis,
      showToast,
      dismissToast,
    }),
    [dataset, analyzed, analyzing, analysisStep, filters, history, toasts, setFilters, startAnalysis, openAnalysis, showToast, dismissToast]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/** 분석된 데이터셋이 없으면 기본 데모 데이터셋을 반환 (대시보드 빈 상태 방지용) */
export function useActiveDataset(): { dataset: DemoDataset; isFallback: boolean } {
  const { dataset } = useApp();
  const fallback = getDemoDatasets()[0];
  return { dataset: dataset ?? fallback, isFallback: dataset == null };
}
