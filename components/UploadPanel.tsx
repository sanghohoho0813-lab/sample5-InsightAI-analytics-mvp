"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Upload, XCircle } from "lucide-react";
import { parseFile, ParseResult, SUPPORTED_COLUMNS } from "@/lib/csv";
import { useApp } from "@/lib/store";
import { DemoDataset } from "@/lib/types";
import { btn } from "@/lib/ui";
import DataTable from "./DataTable";

type Phase = "idle" | "reading" | "ready" | "error";
const MAX_BYTES = 10 * 1024 * 1024;

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
            <p className="text-body font-semibold text-ink">{fileName} 을(를) 읽지 못했습니다</p>
            <p className="mt-1 text-sub text-ink-soft">{result.error}</p>
            <p className="mt-3 text-meta text-ink-dim">
              필수: Date(YYYY-MM-DD), Revenue · 선택: {SUPPORTED_COLUMNS.slice(2).join(", ")} · 한글 헤더(날짜, 매출, 주문수 등)도 인식합니다.
            </p>
            <button onClick={reset} className={`${btn.secondary} mt-4`}>
              다른 파일 선택
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ready" && result) {
    return (
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-5">
          <FileSpreadsheet className="h-6 w-6 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink">{fileName}</p>
            <p className="text-meta text-ink-dim">
              {result.rowCount.toLocaleString("ko-KR")}행 · {result.columns.length}열 · 아래 미리보기를 확인한 뒤 분석을 시작하세요
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
        <div className="border-t border-line p-5">
          <DataTable rows={result.rows} />
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
      <p className="mt-3 text-body font-semibold text-ink">CSV·XLSX 파일을 끌어다 놓거나 선택하세요</p>
      <p className="mt-1 text-meta text-ink-dim">최대 10MB · 필수 컬럼 Date, Revenue · 파일은 서버로 전송되지 않습니다</p>
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
