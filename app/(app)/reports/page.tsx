"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { Panel, PanelHeader } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { BRAND } from "@/lib/brand";
import { reportSignature, scopeLabel, scopeOf } from "@/lib/report";
import { formatKRW, formatNumber, formatValue } from "@/lib/format";
import { SavedReport } from "@/lib/types";
import { SEVERITY_META, btn, field } from "@/lib/ui";

const DATETIME = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

function ReportDetail({ report }: { report: SavedReport }) {
  const router = useRouter();
  const { deleteReport, showToast } = useApp();
  const [confirming, setConfirming] = useState(false);

  const section = "border-t border-line px-5 py-6 md:px-8";
  const h = "text-card font-bold text-ink";

  return (
    <>
      <Link href="/reports" className="no-print mb-4 inline-flex min-h-11 items-center gap-1 text-sub font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden /> 보고서 목록
      </Link>
      <PageHeader
        title={report.title}
        description={`${report.datasetName} · ${scopeLabel(report.scope)}`}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            {confirming ? (
              <>
                <button
                  onClick={() => {
                    deleteReport(report.id);
                    router.push("/reports");
                  }}
                  className={btn.danger}
                >
                  삭제 확인
                </button>
                <button onClick={() => setConfirming(false)} className={btn.secondary}>
                  취소
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setConfirming(true)} className={btn.secondary}>
                  삭제
                </button>
                <button
                  onClick={() => {
                    showToast("인쇄 창에서 '대상 → PDF로 저장'을 선택하세요.", "info");
                    setTimeout(() => window.print(), 300);
                  }}
                  className={btn.primary}
                >
                  PDF로 저장
                </button>
              </>
            )}
          </div>
        }
      />

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
                <tr className="border-b border-line text-left text-caption text-ink-dim">
                  <th className="py-2 font-semibold">지표</th>
                  <th className="py-2 text-right font-semibold">이번 기간</th>
                  <th className="py-2 text-right font-semibold">이전 기간</th>
                  <th className="py-2 text-right font-semibold">변화</th>
                </tr>
              </thead>
              <tbody>
                {report.kpis.map((k) => (
                  <tr key={k.key} className="border-b border-line/70 last:border-0">
                    <td className="py-3 text-ink">{k.label}</td>
                    <td className="tabular py-3 text-right font-semibold text-ink">{formatValue(k.value, k.format)}</td>
                    <td className="tabular py-3 text-right text-ink-soft">{formatValue(k.prevValue, k.format)}</td>
                    <td className={`tabular py-3 text-right font-semibold ${k.changePct >= 0 ? "text-positive" : "text-negative"}`}>
                      {k.changePct >= 0 ? "+" : ""}
                      {k.changePct.toFixed(k.key === "conversion" ? 2 : 1)}
                      {k.key === "conversion" ? "%p" : "%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={section}>
          <h2 className={h}>주요 변화</h2>
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
      <PageHeader title="보고서" description="분석 결과를 저장해두고 다시 열거나 PDF로 내보냅니다. 저장한 보고서는 이 브라우저에 보관됩니다." />

      {dataset && scope ? (
        <Panel className="p-5 md:p-6" aria-labelledby="new-report">
          <h2 id="new-report" className="text-card font-bold text-ink">
            새 보고서
          </h2>
          <p className="mt-1 text-sub text-ink-soft">
            현재 범위 · <b className="font-semibold text-ink">{dataset.name}</b> · {scopeLabel(scope)}
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
              className={`${field} flex-1`}
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
          <p className="mt-3 text-meta text-ink-dim">범위는 대시보드·분석 화면의 기간·채널·상품 선택을 따릅니다.</p>
        </Panel>
      ) : (
        <EmptyState />
      )}

      <Panel className="mt-6" aria-labelledby="saved-reports">
        <PanelHeader id="saved-reports" title="저장한 보고서" description={`${reports.length}건 · 최신순`} />
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
