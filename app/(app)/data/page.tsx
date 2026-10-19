"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import UploadPanel from "@/components/UploadPanel";
import DataTable from "@/components/DataTable";
import { Panel, PanelHeader } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { findDataset } from "@/lib/persist";
import { getDemoDatasets } from "@/lib/demo-data";
import { btn } from "@/lib/ui";
import { capabilities } from "@/lib/capabilities";
import { Check, Database, X } from "lucide-react";
import SampleCard, { samplePreview } from "@/components/SampleCard";

const DATETIME = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

export default function DataPage() {
  const { ready, dataset, history, startAnalysis, openAnalysis } = useApp();
  const demos = getDemoDatasets();
  const [showPreview, setShowPreview] = useState(false);
  const [showAll, setShowAll] = useState(false);
  // 데모 기간은 접속 시점 기준으로 계산되므로 하이드레이션 이후에 표시한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 업로드 원본이 브라우저에 남아 있는지 — 다시 열기 가능 여부
  const reopenable = useMemo(() => {
    if (!mounted) return new Set<string>();
    return new Set(history.filter((h) => findDataset(h.datasetId)).map((h) => h.id));
  }, [history, mounted]);

  const caps = useMemo(() => (dataset ? capabilities(dataset.rows, dataset.derived) : []), [dataset]);
  const dataDays = useMemo(() => (dataset ? new Set(dataset.rows.map((r) => r.date)).size : 0), [dataset]);
  const previews = useMemo(
    () => (mounted ? Object.fromEntries(demos.map((d) => [d.id, samplePreview(d)])) : null),
    [mounted, demos]
  );

  if (!ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="데이터"
        description="분석할 데이터를 고르고, 올리고, 지난 분석을 다시 엽니다"
      />

      {dataset && (
        <Panel className="mb-8 overflow-hidden" aria-labelledby="current-data">
          <div className="flex flex-wrap items-start gap-4 p-5 md:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand" aria-hidden>
              <Database className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">지금 분석 중인 데이터</p>
              <h2 id="current-data" className="mt-0.5 flex flex-wrap items-center gap-2 text-title font-bold text-ink">
                {dataset.name}
                <span className="rounded-full border border-line-strong px-2 py-0.5 text-caption font-semibold text-ink-soft">
                  {dataset.id.startsWith("demo-") ? "샘플" : "업로드"}
                </span>
              </h2>
            </div>
            <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
              <button onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview} className={btn.secondary}>
                {showPreview ? "미리보기 닫기" : "원본 미리보기"}
              </button>
              <Link href="/dashboard" className={btn.secondary}>
                대시보드 보기
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line md:grid-cols-4 [&>div]:bg-surface [&>div]:px-5 [&>div]:py-4 md:[&>div]:px-6">
            <div>
              <dt className="text-caption text-ink-dim">기간</dt>
              <dd className="tabular mt-0.5 text-sub font-semibold text-ink" suppressHydrationWarning>
                {mounted ? dataset.periodLabel : "\u00a0"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-dim">데이터</dt>
              <dd className="tabular mt-0.5 text-sub font-semibold text-ink">
                {dataset.rows.length.toLocaleString("ko-KR")}행 · {dataDays}일치
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-dim">채널</dt>
              <dd className="mt-0.5 truncate text-sub font-semibold text-ink" title={dataset.channels.join(", ")}>
                {dataset.channels.length}개 <span className="font-normal text-ink-soft">· {dataset.channels.slice(0, 2).join(", ")}{dataset.channels.length > 2 ? " 외" : ""}</span>
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-dim">상품</dt>
              <dd className="mt-0.5 truncate text-sub font-semibold text-ink" title={dataset.products.join(", ")}>
                {dataset.products.length}개 <span className="font-normal text-ink-soft">· {dataset.products.slice(0, 2).join(", ")}{dataset.products.length > 2 ? " 외" : ""}</span>
              </dd>
            </div>
          </dl>
          <div className="border-t border-line bg-surface-soft px-5 py-4 md:px-6">
            <p className="eyebrow">이 데이터로 하는 분석</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {caps.map((c) => (
                <li
                  key={c.label}
                  className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-meta ${
                    c.ok ? "border-line bg-surface text-ink" : "border-dashed border-line-strong text-ink-dim"
                  }`}
                  title={c.note}
                >
                  {c.ok ? <Check className="h-3.5 w-3.5 text-positive" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                  {c.label}
                  <span className="sr-only">{c.ok ? " 가능" : ` 불가 — ${c.note}`}</span>
                </li>
              ))}
            </ul>
          </div>
          {showPreview && (
            <div className="border-t border-line p-5 md:p-6">
              <DataTable rows={dataset.rows} derived={dataset.derived} />
            </div>
          )}
        </Panel>
      )}

      <section aria-labelledby="upload-title" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="upload-title" className="text-title font-bold text-ink">
            내 파일 올리기
          </h2>
          <p className="text-meta text-ink-dim">올리면 바로 분석하지 않고 진단부터 보여드립니다</p>
        </div>
        <UploadPanel />
      </section>

      <section aria-labelledby="sample-title" className="mt-10 min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sample-title" className="text-title font-bold text-ink">
            샘플 데이터
          </h2>
          <p className="text-meta text-ink-dim">업종별 90일 데이터 · 누르면 바로 분석합니다</p>
        </div>
        <ul className="grid gap-5 md:grid-cols-3">
          {demos.map((ds) => (
            <SampleCard
              key={ds.id}
              ds={ds}
              preview={previews?.[ds.id] ?? null}
              active={dataset?.id === ds.id}
              onAnalyze={() => startAnalysis(ds)}
            />
          ))}
        </ul>
      </section>

      <div className="mt-10">
      <Panel className="min-w-0 self-start" aria-labelledby="history-title">
        <PanelHeader
          id="history-title"
          title="분석 기록"
          description={history.length ? `${history.length}건 · 최신순 · 이 브라우저에 보관` : undefined}
        />
        {history.length === 0 ? (
          <p className="px-5 pb-8 pt-6 text-center text-sub text-ink-dim md:px-6">
            아직 분석 기록이 없습니다. 샘플 데이터나 파일로 첫 분석을 시작해보세요.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {(showAll ? history : history.slice(0, 5)).map((h) => {
              const canOpen = reopenable.has(h.id);
              const isCurrent = dataset?.id === h.datasetId;
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-3 px-5 py-4 md:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-semibold text-ink">{h.datasetName}</p>
                    <p className="mt-1 text-meta text-ink-dim" suppressHydrationWarning>
                      {mounted ? DATETIME.format(new Date(h.createdAt)) : ""} · {h.datasetId.startsWith("demo-") ? "샘플" : "업로드"}
                      {h.revenueChangePct != null && (
                        <>
                          {" "}· 매출 {h.revenueChangePct >= 0 ? "+" : ""}
                          {h.revenueChangePct}%
                        </>
                      )}
                      {h.alertCount != null && <> · 주의 {h.alertCount}건</>}
                    </p>
                    <p className="mt-1 text-sub text-ink-soft">{h.keyInsight}</p>
                  </div>
                  {canOpen ? (
                    <button onClick={() => openAnalysis(h)} className={btn.secondary}>
                      {isCurrent ? "대시보드로" : "다시 열기"}
                    </button>
                  ) : (
                    <span className="text-meta text-ink-dim" title="원본 파일이 브라우저에 남아 있지 않습니다">
                      원본 없음 · 재업로드 필요
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {history.length > 5 && (
          <div className="border-t border-line px-5 py-2 md:px-6">
            <button onClick={() => setShowAll((v) => !v)} className={btn.quiet} aria-expanded={showAll}>
              {showAll ? "최근 5건만 보기" : `전체 ${history.length}건 보기`}
            </button>
          </div>
        )}
      </Panel>
      </div>
    </>
  );
}
