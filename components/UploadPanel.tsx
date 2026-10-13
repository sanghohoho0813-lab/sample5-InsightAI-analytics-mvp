"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, FileSpreadsheet, Info, Minus, Upload, X, XCircle } from "lucide-react";
import { parseFile, ParseResult } from "@/lib/csv";
import { capabilities, fitPreset } from "@/lib/capabilities";
import { useApp } from "@/lib/store";
import { DemoDataset } from "@/lib/types";
import { btn } from "@/lib/ui";
import DataTable from "./DataTable";

type Phase = "idle" | "reading" | "ready" | "error";
const MAX_BYTES = 10 * 1024 * 1024;
const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`;

const STEPS = ["파일 읽기", "열 인식", "분석 가능 항목", "기간", "품질 확인"];

function Section({ n, title, children, aside }: { n: number; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-5 md:px-6" aria-labelledby={`diag-${n}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`diag-${n}`} className="flex items-center gap-2 text-sub font-bold text-ink">
          <span className="tabular flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[12px] font-bold text-brand">{n}</span>
          {title}
        </h3>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** 열 인식 결과 — 넓은 화면은 표, 좁은 화면은 한 줄 목록 */
function ColumnMapping({ result }: { result: ParseResult }) {
  const mapping = result.mapping ?? [];
  return (
    <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
      {mapping.map((m, i) => {
        const used = !!m.field && !(m.emptyRatio === 1 && m.field !== "date" && m.field !== "revenue");
        return (
          <li key={`${m.column}-${i}`} className="flex min-h-9 items-center gap-2 text-sub">
            {used ? (
              <Check className="h-4 w-4 shrink-0 text-positive" aria-label="인식됨" />
            ) : (
              <Minus className="h-4 w-4 shrink-0 text-ink-dim" aria-label="사용하지 않음" />
            )}
            <span className={`min-w-0 truncate ${used ? "text-ink" : "text-ink-dim"}`} title={m.column}>
              {m.column}
            </span>
            <span className="text-ink-dim" aria-hidden>
              →
            </span>
            <span className={`shrink-0 ${used ? "font-semibold text-ink" : "text-ink-dim"}`}>
              {used ? m.label : m.duplicate ? "중복 열" : m.field ? "빈 열" : "사용 안 함"}
            </span>
            {m.sample && used && <span className="tabular hidden min-w-0 truncate text-meta text-ink-dim md:inline">예: {m.sample}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** CSV/XLSX 업로드 — 파일 → 열 인식 → 분석 가능 항목 → 기간 → 품질 확인 → 분석 시작 */
export default function UploadPanel() {
  const { startAnalysis, settings } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);

  const fail = (error: string) => {
    setResult({ rows: [], columns: [], rowCount: 0, error });
    setPhase("error");
  };

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    if (!/\.(csv|xlsx|xls)$/i.test(file.name)) return fail("CSV 또는 XLSX 파일만 올릴 수 있습니다. 엑셀에서 '다른 이름으로 저장 → CSV'로 바꿀 수 있습니다.");
    if (file.size === 0) return fail("빈 파일입니다. 내용이 있는 파일을 골라주세요.");
    if (file.size > MAX_BYTES) return fail("10MB 이하 파일만 올릴 수 있습니다. 기간을 나눠 올려주세요.");
    setPhase("reading");
    try {
      const parsed = await parseFile(file);
      setResult(parsed);
      setPhase(parsed.error ? "error" : "ready");
    } catch {
      fail("파일을 읽는 중 오류가 났습니다. 암호가 걸려 있거나 손상된 파일인지 확인해주세요.");
    }
  }, []);

  const caps = useMemo(() => (result && result.rows.length ? capabilities(result.rows, result.derived) : []), [result]);

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

  const samples = (
    <a href="/sample/insightai-sample.csv" download className={btn.quiet}>
      예시 CSV 내려받기
    </a>
  );

  if (phase === "reading") {
    return (
      <div className="card flex items-center gap-3 p-6" role="status">
        <FileSpreadsheet className="h-6 w-6 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body font-semibold text-ink">{fileName}</p>
          <p className="text-meta text-ink-dim">파일을 읽고 열을 확인하고 있습니다…</p>
        </div>
      </div>
    );
  }

  if (phase === "error" && result) {
    return (
      <div className="card" role="alert">
        <div className="flex items-start gap-3 p-5 md:p-6">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-negative" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-ink">이 파일로는 분석을 시작할 수 없습니다</p>
            <p className="truncate text-meta text-ink-dim">{fileName}</p>
            <p className="mt-2 text-sub text-ink">{result.error}</p>
          </div>
        </div>
        {result.mapping && result.mapping.length > 0 && (
          <Section n={1} title="파일에서 찾은 열">
            <ColumnMapping result={result} />
          </Section>
        )}
        <div className="border-t border-line bg-surface-soft px-5 py-4 md:px-6">
          <p className="text-meta text-ink-soft">
            필수 열은 <b className="font-semibold text-ink">날짜</b>와 <b className="font-semibold text-ink">매출</b>입니다. 주문 수·방문자·채널·상품·광고비·고객 수 열이 있으면 원인 분석과 광고 효율까지 계산합니다. 영문·한글 헤더 모두 읽습니다.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button onClick={reset} className={btn.secondary}>
              다른 파일 선택
            </button>
            {samples}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ready" && result) {
    const issues = result.issues ?? [];
    const warnings = issues.filter((i) => i.level !== "info").length;
    const p = result.period!;
    const preset = fitPreset(p.days, settings.defaultPreset);
    const can = caps.filter((c) => c.ok);
    const cannot = caps.filter((c) => !c.ok);
    const used = (result.mapping ?? []).filter((m) => m.field).length;

    return (
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 p-5 md:p-6">
          <FileSpreadsheet className="h-6 w-6 shrink-0 text-brand" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink">{fileName}</p>
            <p className="text-meta text-ink-dim">
              {result.rowCount.toLocaleString("ko-KR")}행 · {p.days}일치 · {result.columns.length}열
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

        <ol className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line bg-surface-soft px-5 py-2.5 text-meta md:px-6" aria-label="진단 단계">
          {STEPS.map((s, i) => {
            const warn = i === 4 && warnings > 0;
            return (
              <li key={s} className={`flex items-center gap-1 ${warn ? "text-warning" : "text-ink-soft"}`}>
                {warn ? <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> : <Check className="h-3.5 w-3.5 text-positive" aria-hidden />}
                {s}
                {warn && ` ${warnings}건`}
              </li>
            );
          })}
        </ol>

        <Section n={1} title="열 인식" aside={<span className="text-meta text-ink-dim">{result.columns.length}열 중 {used}열 사용</span>}>
          <ColumnMapping result={result} />
        </Section>

        <Section n={2} title="이 파일로 분석할 수 있는 것">
          <div className="grid gap-4 md:grid-cols-2">
            <ul className="space-y-1.5">
              {can.map((c) => (
                <li key={c.label} className="flex items-start gap-2 text-sub">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
                  <span>
                    <span className="font-semibold text-ink">{c.label}</span> <span className="text-ink-soft">· {c.note}</span>
                  </span>
                </li>
              ))}
            </ul>
            {cannot.length > 0 && (
              <div>
                <p className="text-caption font-semibold text-ink-dim">이 파일로는 계산하지 않는 것</p>
                <ul className="mt-1.5 space-y-1.5">
                  {cannot.map((c) => (
                    <li key={c.label} className="flex items-start gap-2 text-sub">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                      <span>
                        <span className="text-ink-soft">{c.label}</span> <span className="text-ink-dim">· {c.note}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {cannot.length > 0 && (
            <p className="mt-3 text-meta text-ink-dim">없는 열을 다른 값으로 지어내지 않습니다. 해당 지표는 화면에 표시하지 않습니다.</p>
          )}
        </Section>

        <Section n={3} title="기간">
          <p className="text-body text-ink">
            <span className="tabular font-semibold">
              {p.start.replaceAll("-", ".")} ~ {p.end.replaceAll("-", ".")}
            </span>{" "}
            <span className="text-ink-soft">
              · {p.days}일치{p.missing > 0 ? ` · 기록 없는 날 ${p.missing}일` : ""}
            </span>
          </p>
          <p className="mt-1 text-sub text-ink-soft">
            {p.days >= 14
              ? `처음에는 최근 ${preset}일(${md(p.end)}까지)을 이전 ${preset}일과 비교해 보여드립니다. 기간은 화면 위에서 바꿀 수 있습니다.`
              : "기간이 짧아 이전 기간과 비교하지 않고 전체 기간의 흐름만 보여드립니다."}
          </p>
        </Section>

        <Section
          n={4}
          title="데이터 품질"
          aside={<span className={`text-meta font-semibold ${warnings ? "text-warning" : "text-positive"}`}>{warnings ? `확인할 점 ${warnings}건` : "문제 없음"}</span>}
        >
          {issues.length === 0 ? (
            <p className="flex items-center gap-2 text-sub text-ink-soft">
              <Check className="h-4 w-4 text-positive" aria-hidden /> 날짜·매출 값이 모두 정상이고 중복·빈 열이 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {issues.map((i) => (
                <li key={i.title} className="flex items-start gap-2">
                  {i.level === "info" ? (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-dim" aria-label="참고" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-label="확인 필요" />
                  )}
                  <span>
                    <span className="block text-sub font-semibold text-ink">{i.title}</span>
                    <span className="block text-meta text-ink-soft">{i.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-soft px-5 py-4 md:px-6">
          <p className="text-meta text-ink-soft">
            {warnings ? "위 내용을 반영해 분석합니다. 원본을 고쳐 다시 올려도 됩니다." : "바로 분석할 수 있는 파일입니다."}
          </p>
          <button onClick={begin} className={btn.primary}>
            이대로 분석 시작
          </button>
        </div>

        <details className="group border-t border-line">
          <summary className="flex min-h-12 cursor-pointer list-none items-center px-5 text-sub font-semibold text-ink-soft hover:text-ink md:px-6 [&::-webkit-details-marker]:hidden">
            읽은 데이터 미리보기
          </summary>
          <div className="px-5 pb-5 md:px-6">
            <DataTable rows={result.rows} derived={result.derived} />
          </div>
        </details>
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
      <p className="mt-1 text-meta text-ink-dim">필수 열은 날짜·매출 · 최대 10MB · 파일은 서버로 보내지 않고 브라우저에서 읽습니다</p>
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
      <p className="mt-4 max-w-md text-meta text-ink-dim">
        올리면 바로 분석하지 않고, 어떤 열을 인식했는지·무엇을 분석할 수 있는지·데이터에 문제가 없는지 먼저 보여드립니다.
      </p>
      <div className="mt-2">{samples}</div>
    </div>
  );
}
