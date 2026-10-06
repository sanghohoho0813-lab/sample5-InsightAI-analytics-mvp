"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import FilterToolbar from "@/components/FilterToolbar";
import { Panel, PanelHeader } from "@/components/Panel";
import { findDataset, useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { reportSignature, scopeLabel, scopeOf } from "@/lib/report";
import { formatKRW, formatNumber, formatValue } from "@/lib/format";
import { SavedReport } from "@/lib/types";
import { SEVERITY_META, btn, field } from "@/lib/ui";

const DATETIME = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

function ReportDetail({ report }: { report: SavedReport }) {
  const router = useRouter();
  const { dataset, deleteReport, renameReport, showToast, switchDataset, setCustomRange, setFilters } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(report.title);
  const source = findDataset(report.datasetId);

  const section = "border-t border-line px-5 py-6 md:px-8";
  const h = "text-card font-bold text-ink";

  const saveTitle = () => {
    const t = draft.trim();
    if (!t) return;
    if (t !== report.title) {
      renameReport(report.id, t);
      showToast("제목을 바꿨습니다.", "success");
    }
    setEditing(false);
  };

  // 보고서를 만든 범위 그대로 대시보드를 다시 연다.
  const openScope = () => {
    if (!source) return;
    if (dataset?.id !== source.id) switchDataset(source);
    setCustomRange(report.scope.start, report.scope.end);
    setFilters({ channel: report.scope.channel, product: report.scope.product });
    router.push("/dashboard");
  };

  return (
    <>
      <Link href="/reports" className="no-print mb-4 inline-flex min-h-11 items-center gap-1 text-sub font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> 보고서 목록
      </Link>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveTitle();
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="rename" className="sr-only">
                보고서 제목
              </label>
              <input
                id="rename"
                autoFocus
                value={draft}
                maxLength={60}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && (setDraft(report.title), setEditing(false))}
                className={`${field} h-12 w-full text-lead font-semibold sm:flex-1`}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={!draft.trim()} className={btn.primary}>
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(report.title);
                    setEditing(false);
                  }}
                  className={btn.secondary}
                >
                  취소
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-start gap-1">
              <h1 className="min-w-0 text-page font-bold tracking-tight text-ink">{report.title}</h1>
              <button
                onClick={() => setEditing(true)}
                className="no-print mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-ink-dim hover:bg-surface hover:text-ink"
                aria-label="제목 수정"
                title="제목 수정"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          <p className="mt-2 text-body text-ink-soft">
            {report.title.includes(report.datasetName) ? "" : `${report.datasetName} · `}
            {scopeLabel(report.scope)}
          </p>
        </div>
        <div className="no-print flex shrink-0 flex-wrap gap-2">
          {source && (
            <button onClick={openScope} className={btn.secondary}>
              이 범위로 대시보드 열기
            </button>
          )}
          <button
            onClick={() => {
              showToast("인쇄 창에서 '대상 → PDF로 저장'을 선택하세요.", "info");
              setTimeout(() => window.print(), 300);
            }}
            className={btn.primary}
          >
            PDF로 저장
          </button>
        </div>
      </div>

      <Panel as="article" className="overflow-hidden" aria-label="보고서 본문">
        <div className="px-5 py-6 md:px-8">
          <p className="text-meta text-ink-dim">
            저장 {DATETIME.format(new Date(report.createdAt))} · 작성 {BRAND.user.display} · 샘플 데이터 · 규칙 기반 분석
          </p>
          <h2 className="mt-3 text-caption font-semibold text-ink-dim">요약</h2>
          <p className="mt-1 text-lead font-medium text-ink">{report.headline}</p>
        </div>

        <div className={section}>
          <h2 className={h}>핵심 지표</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sub">
              <thead>
                <tr className="whitespace-nowrap border-b border-line text-left text-caption text-ink-dim">
                  <th className="py-2 font-semibold">지표</th>
                  <th className="py-2 text-right font-semibold">이번 기간</th>
                  <th className="hidden py-2 text-right font-semibold sm:table-cell">이전 기간</th>
                  <th className="py-2 text-right font-semibold">변화</th>
                </tr>
              </thead>
              <tbody>
                {report.kpis.map((k) => (
                  <tr key={k.key} className="border-b border-line/70 last:border-0">
                    <td className="py-3 text-ink">{k.label}</td>
                    <td className="tabular py-3 text-right font-semibold text-ink">{formatValue(k.value, k.format)}</td>
                    <td className="tabular hidden py-3 text-right text-ink-soft sm:table-cell">{k.comparable === false ? "–" : formatValue(k.prevValue, k.format)}</td>
                    {k.comparable === false ? (
                      <td className="py-3 text-right text-ink-dim">–</td>
                    ) : (
                      <td className={`tabular py-3 text-right font-semibold ${k.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                        {k.changePct >= 0 ? "+" : ""}
                        {k.changePct.toFixed(k.key === "conversion" ? 2 : 1)}
                        {k.key === "conversion" ? "%p" : "%"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={section}>
          <h2 className={h}>주요 변화</h2>
          {report.findings.length === 0 && <p className="mt-3 text-sub text-ink-soft">이 범위에서는 뚜렷한 변화가 없었습니다.</p>}
          <ol className="mt-3 space-y-4">
            {report.findings.map((f, i) => (
              <li key={i}>
                <p className="text-body font-semibold text-ink">
                  {i + 1}. {f.title}
                </p>
                <p className="mt-1 text-sub text-ink-soft">{f.description}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className={section}>
          <h2 className={h}>확인이 필요한 변화</h2>
          {report.anomalies.length === 0 ? (
            <p className="mt-3 text-sub text-ink-soft">이 범위에서는 주의가 필요한 변화가 없었습니다.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {report.anomalies.map((a, i) => (
                <li key={i} className="text-sub text-ink-soft">
                  <b className={`font-semibold ${SEVERITY_META[a.severity].text}`}>[{SEVERITY_META[a.severity].label}]</b>{" "}
                  <b className="font-semibold text-ink">{a.title}</b> — {a.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        {report.forecasts.length > 0 && (
        <div className={section}>
          <h2 className={h}>다음 7일 예측</h2>
          <p className="mt-1 text-meta text-ink-dim">최근 14일 추세 기반 단순 모델 · 추정치</p>
          <dl className="mt-3 grid gap-4 sm:grid-cols-3">
            {report.forecasts.map((f) => (
              <div key={f.label}>
                <dt className="text-meta text-ink-soft">{f.label}</dt>
                <dd className="tabular mt-1 text-card font-bold text-ink">
                  {f.format === "currency" ? formatKRW(f.next7Total) : formatNumber(f.next7Total)}
                </dd>
                <dd className={`tabular text-meta font-semibold ${f.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                  직전 7일 대비 {f.changePct >= 0 ? "+" : ""}
                  {f.changePct.toFixed(1)}%
                </dd>
              </div>
            ))}
          </dl>
        </div>
        )}

        <div className={section}>
          <h2 className={h}>실행 제안</h2>
          <ol className="mt-3 space-y-4">
            {report.recommendations.map((r, i) => (
              <li key={i}>
                <p className="text-body font-semibold text-ink">
                  {i + 1}. {r.title}
                </p>
                <p className="mt-1 text-sub text-ink-soft">{r.description}</p>
                <p className="mt-1 text-meta text-ink-dim">예상 효과(추정) {r.expectedEffect}</p>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <div className="no-print mt-4 flex justify-end">
        <button
          onClick={() => {
            deleteReport(report.id);
            router.push("/reports");
          }}
          className="inline-flex min-h-11 items-center gap-1 px-2 text-sub font-semibold text-ink-dim transition-colors hover:text-negative"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> 이 보고서 삭제
        </button>
      </div>
    </>
  );
}

function ReportLibrary() {
  const router = useRouter();
  const { dataset, filters, reports, saveReport } = useApp();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const scope = useMemo(() => (dataset ? scopeOf(dataset, filters) : null), [dataset, filters]);
  const existing = dataset ? reports.find((r) => r.signature === reportSignature(dataset, filters)) : undefined;

  const create = () => {
    setBusy(true);
    // 계산은 즉시 끝나지만 저장 중임을 인지할 수 있게 짧게 멈춘다.
    setTimeout(() => {
      const r = saveReport(title);
      setBusy(false);
      setTitle("");
      if (r) router.push(`/reports?id=${r.id}`);
    }, 400);
  };

  return (
    <>
      <PageHeader title="보고서" description="저장한 분석 결과를 다시 열거나 PDF로 내보냅니다" />

      {dataset && scope ? (
        <>
        <FilterToolbar dataset={dataset} />
        <Panel className="p-5 md:p-6" aria-labelledby="new-report">
          <h2 id="new-report" className="text-card font-bold text-ink">
            새 보고서
          </h2>
          <p className="mt-1 text-sub text-ink-soft">
            <b className="font-semibold text-ink">{dataset.name}</b> · {scopeLabel(scope)}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="report-title" className="sr-only">
              보고서 제목
            </label>
            <input
              id="report-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목 (비워두면 자동으로 붙습니다)"
              maxLength={60}
              className={`${field} w-full sm:flex-1`}
            />
            <button type="submit" disabled={busy} className={btn.primary}>
              {busy ? "저장 중…" : "보고서 만들기"}
            </button>
          </form>
          {existing && (
            <p className="mt-3 text-meta text-ink-dim">
              같은 범위로 저장한 보고서가 있습니다 ·{" "}
              <Link href={`/reports?id=${existing.id}`} className="font-semibold text-brand hover:underline">
                {existing.title}
              </Link>
            </p>
          )}

        </Panel>
        </>
      ) : (
        <EmptyState />
      )}

      <Panel className="mt-6" aria-labelledby="saved-reports">
        <PanelHeader
          id="saved-reports"
          title="저장한 보고서"
          description={reports.length ? `${reports.length}건 · 이 브라우저에 보관` : undefined}
        />
        {reports.length === 0 ? (
          <p className="px-5 pb-8 pt-6 text-center text-sub text-ink-dim md:px-6">
            아직 저장한 보고서가 없습니다. 위에서 첫 보고서를 만들어보세요.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {reports.map((r) => (
              <li key={r.id}>
                <Link href={`/reports?id=${r.id}`} className="block px-5 py-4 transition-colors hover:bg-surface-soft md:px-6">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-body font-semibold text-ink">{r.title}</span>
                    <span className="tabular text-meta text-ink-dim">{DATETIME.format(new Date(r.createdAt))}</span>
                  </span>
                  <span className="mt-1 block text-meta text-ink-dim">
                    {r.datasetName} · {scopeLabel(r.scope)}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sub text-ink-soft">{r.headline}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function ReportsView() {
  const params = useSearchParams();
  const { ready, reports } = useApp();
  const id = params.get("id");

  if (!ready) return <PageSkeleton />;
  if (id) {
    const report = reports.find((r) => r.id === id);
    if (!report) {
      return (
        <>
          <PageHeader title="보고서를 찾을 수 없습니다" description="삭제되었거나 다른 브라우저에서 저장한 보고서입니다." />
          <Link href="/reports" className={btn.secondary}>
            보고서 목록으로
          </Link>
        </>
      );
    }
    return <ReportDetail report={report} />;
  }
  return <ReportLibrary />;
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsView />
    </Suspense>
  );
}
