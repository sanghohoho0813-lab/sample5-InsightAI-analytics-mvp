"use client";

import { useCallback, useRef, useState } from "react";
import { CloudUpload, FileSpreadsheet, Play, RotateCcw, XCircle } from "lucide-react";
import { parseFile, ParseResult, SUPPORTED_COLUMNS } from "@/lib/csv";
import { useApp } from "@/lib/store";
import { DemoDataset } from "@/lib/types";
import DataTable from "./DataTable";

type Phase = "idle" | "reading" | "ready" | "error";

/** CSV/XLSX 업로드 패널 — 드래그&드롭, 진행 표시, 미리보기, 분석 시작 */
export default function UploadPanel() {
  const { startAnalysis, showToast } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setPhase("reading");
    setProgress(15);
    const timer = setInterval(() => setProgress((p) => Math.min(90, p + 18)), 180);
    try {
      const parsed = await parseFile(file);
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => {
        setResult(parsed);
        setPhase(parsed.error ? "error" : "ready");
      }, 350);
    } catch {
      clearInterval(timer);
      setResult({ rows: [], columns: [], rowCount: 0, error: "파일을 읽는 중 오류가 발생했습니다. 파일 구조를 확인해주세요." });
      setPhase("error");
    }
  }, []);

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setFileName("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const begin = () => {
    if (!result || result.rows.length === 0) return;
    const channels = Array.from(new Set(result.rows.map((r) => r.channel)));
    const products = Array.from(new Set(result.rows.map((r) => r.product)));
    const dates = result.rows.map((r) => r.date);
    const ds: DemoDataset = {
      id: `upload-${Date.now()}`,
      name: fileName.replace(/\.(csv|xlsx|xls)$/i, ""),
      description: "업로드한 데이터",
      category: "업로드",
      rows: result.rows,
      channels,
      products,
      periodLabel: `${dates[0]?.replaceAll("-", ".")} ~ ${dates[dates.length - 1]?.replaceAll("-", ".")}`,
    };
    showToast("업로드한 데이터로 분석을 시작합니다.", "info");
    startAnalysis(ds);
  };

  if (phase === "reading") {
    return (
      <div className="card p-8 text-center animate-fade-in">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-brand" />
        <p className="mt-3 text-[14px] font-semibold">{fileName}</p>
        <p className="mt-1 text-[12px] text-ink-dim">파일을 읽고 있습니다…</p>
        <div className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (phase === "error" && result) {
    return (
      <div className="card border-negative/30 p-6 animate-fade-in">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-negative" />
          <div className="flex-1">
            <p className="text-[14px] font-semibold">업로드에 실패했습니다</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{result.error}</p>
            <div className="mt-3 rounded-xl border border-line bg-surface-soft p-3.5 text-[12px] text-ink-dim">
              <p className="mb-1.5 font-medium text-ink-soft">지원 컬럼 예시</p>
              <p className="leading-relaxed">{SUPPORTED_COLUMNS.join(" · ")}</p>
              <p className="mt-1.5">필수: Date(YYYY-MM-DD), Revenue · 한글 헤더(날짜, 매출, 주문수…)도 인식합니다.</p>
            </div>
            <button
              onClick={reset}
              className="mt-4 flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-line-strong"
            >
              <RotateCcw className="h-4 w-4" /> 다시 업로드
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ready" && result) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-brand" />
            <div>
              <p className="text-[13.5px] font-semibold">{fileName}</p>
              <p className="text-[11.5px] text-ink-dim">업로드 완료 · 미리보기를 확인한 뒤 분석을 시작하세요</p>
            </div>
          </div>
          <div className="flex gap-5 text-[12.5px] text-ink-soft">
            <span><b className="text-ink">{result.rowCount.toLocaleString("ko-KR")}</b> 행</span>
            <span><b className="text-ink">{result.columns.length}</b> 열</span>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={reset}
              className="rounded-xl border border-line px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-line-strong"
            >
              취소
            </button>
            <button
              onClick={begin}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-[13px] font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark"
            >
              <Play className="h-4 w-4" /> 분석 시작
            </button>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-3 text-[14px] font-semibold">데이터 미리보기</h3>
          <DataTable rows={result.rows} />
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`card flex flex-col items-center justify-center border-2 border-dashed p-10 text-center transition-colors duration-300 ${
        dragOver ? "border-brand bg-brand-soft" : "border-line"
      }`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
        <CloudUpload className="h-7 w-7 text-brand" />
      </span>
      <p className="mt-4 text-[15px] font-semibold">파일을 끌어다 놓거나 선택하세요</p>
      <p className="mt-1 text-[12.5px] text-ink-dim">CSV, XLSX 지원 · 최대 10MB</p>
      <button
        onClick={() => inputRef.current?.click()}
        className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark"
      >
        파일 선택
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <p className="mt-4 text-[11.5px] text-ink-dim">
        필수 컬럼: Date, Revenue · 선택: Orders, Customers, Channel, Product 등
      </p>
    </div>
  );
}
