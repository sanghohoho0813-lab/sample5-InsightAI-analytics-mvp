"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { parseFile, ParseResult } from "@/lib/csv";
import { useApp } from "@/lib/store";
import { DemoDataset, DerivedField } from "@/lib/types";
import { btn } from "@/lib/ui";
import DataTable from "./DataTable";

type Phase = "idle" | "reading" | "ready" | "error";
const MAX_BYTES = 10 * 1024 * 1024;
const FIELD_LABEL: Partial<Record<DerivedField, string>> = {
  orders: "주문 수",
  visitors: "방문자",
  customers: "고객 수",
  returningCustomers: "재구매 고객",
  adSpend: "광고비",
};

/** CSV/XLSX 업로드 — 선택 → 읽기 → 미리보기 확인 → 분석 시작 */
export default function UploadPanel() {
  const { startAnalysis } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
      setResult({ rows: [], columns: [], rowCount: 0, error: "CSV 또는 XLSX 파일만 올릴 수 있습니다." });
      setPhase("error");
      return;
    }
    if (file.size === 0) {
      setResult({ rows: [], columns: [], rowCount: 0, error: "빈 파일입니다. 내용이 있는 파일을 골라주세요." });
      setPhase("error");
      return;
    }
    if (file.size > MAX_BYTES) {
      setResult({ rows: [], columns: [], rowCount: 0, error: "10MB 이하 파일만 올릴 수 있습니다." });
      setPhase("error");
      return;
    }
    setPhase("reading");
    try {
      const parsed = await parseFile(file);
      setResult(parsed);
      setPhase(parsed.error ? "error" : "ready");
    } catch {
      setResult({ rows: [], columns: [], rowCount: 0, error: "파일을 읽는 중 오류가 발생했습니다. 파일 구조를 확인해주세요." });
      setPhase("error");
    }
  }, []);

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const begin = () => {
    if (!result || result.rows.length === 0) return;
    const channels = Array.from(new Set(result.rows.map((r) => r.channel)));
    const products = Array.from(new Set(result.rows.map((r) => r.product)));
    const dates = result.rows.map((r) => r.date);
    const ds: DemoDataset = {
      id: `upload-${Date.now().toString(36)}`,
      name: fileName.replace(/\.(csv|xlsx|xls)$/i, ""),
      description: "업로드한 데이터",
      category: "업로드",
      rows: result.rows,
      channels,
      products,
      periodLabel: `${dates[0]?.replaceAll("-", ".")} ~ ${dates[dates.length - 1]?.replaceAll("-", ".")}`,
      derived: result.derived ?? [],
    };
    startAnalysis(ds);
  };

  if (phase === "reading") {
    return (
      <div className="card flex items-center gap-3 p-6" role="status">
        <FileSpreadsheet className="h-6 w-6 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{fileName}</p>
          <p className="text-meta text-ink-dim">파일을 읽고 있습니다…</p>
        </div>
      </div>
    );
  }

  if (phase === "error" && result) {
    return (
      <div className="card p-6" role="alert">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-negative" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">파일을 읽지 못했습니다</p>
            <p className="truncate text-meta text-ink-dim">{fileName}</p>
            <p className="mt-1 text-sub text-ink-soft">{result.error}</p>
            <p className="mt-3 text-meta text-ink-dim">
              필수 컬럼은 날짜(YYYY-MM-DD)와 매출입니다. 주문 수·방문자·고객 수·채널·상품·광고비가 있으면 더 많은 지표를 보여드립니다. 영문·한글 헤더 모두 인식합니다.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button onClick={reset} className={btn.secondary}>
                다른 파일 선택
              </button>
              <a href="/sample/insightai-sample.csv" download className={btn.quiet}>
                예시 CSV 내려받기
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ready" && result) {
    const days = new Set(result.rows.map((r) => r.date)).size;
    const missing = (result.derived ?? [])
      .map((f) => FIELD_LABEL[f])
      .filter(Boolean);
    const notes = [
      result.skipped ? `날짜를 읽지 못한 ${result.skipped.toLocaleString("ko-KR")}행은 제외했습니다.` : null,
      missing.length ? `${missing.join(", ")} 컬럼이 없어 관련 지표는 표시하지 않습니다.` : null,
      days < 14 ? `${days}일치 데이터라 예측(14일 이상)과 이전 기간 비교가 제한됩니다.` : null,
    ].filter(Boolean) as string[];
    return (
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <FileSpreadsheet className="h-6 w-6 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink">{fileName}</p>
            <p className="text-meta text-ink-dim">
              {result.rowCount.toLocaleString("ko-KR")}행 · {days}일치 · {result.columns.length}열
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className={btn.secondary}>
              취소
            </button>
            <button onClick={begin} className={btn.primary}>
              분석 시작
            </button>
          </div>
        </div>
        {notes.length > 0 && (
          <ul className="space-y-1 border-t border-line bg-surface-soft px-5 py-3 text-meta text-ink-soft">
            {notes.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        )}
        <div className="border-t border-line p-5">
          <DataTable rows={result.rows} derived={result.derived} />
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors ${
        dragOver ? "border-brand bg-brand-soft" : "border-line-strong bg-surface"
      }`}
    >
      <Upload className="h-7 w-7 text-ink-dim" aria-hidden />
      <p className="mt-3 text-body font-semibold text-ink">
        <span className="hidden sm:inline">CSV·XLSX 파일을 끌어다 놓거나 선택하세요</span>
        <span className="sm:hidden">CSV·XLSX 파일을 선택하세요</span>
      </p>
      <p className="mt-1 text-meta text-ink-dim">필수 컬럼은 날짜·매출 · 최대 10MB · 파일은 서버로 전송되지 않습니다</p>
      <button onClick={() => inputRef.current?.click()} className={`${btn.primary} mt-5`}>
        파일 선택
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        aria-label="분석할 파일 선택"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <a href="/sample/insightai-sample.csv" download className={`${btn.quiet} mt-2`}>
        예시 CSV 내려받기
      </a>
    </div>
  );
}
