"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import UploadPanel from "@/components/UploadPanel";
import DataTable from "@/components/DataTable";
import { Panel, PanelHeader } from "@/components/Panel";
import { findDataset, useApp } from "@/lib/store";
import { getDemoDatasets } from "@/lib/demo-data";
import { btn } from "@/lib/ui";

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

  if (!ready) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="데이터"
        description="파일을 올리거나 샘플을 골라 분석합니다"
      />

      {dataset && (
        <Panel className="mb-6 p-5 md:p-6" aria-labelledby="current-data">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-semibold text-ink-dim">지금 분석 중인 데이터</p>
              <h2 id="current-data" className="mt-1 text-card font-bold text-ink">
                {dataset.name}
              </h2>
              <p className="mt-1 text-meta text-ink-soft" suppressHydrationWarning>
                {dataset.id.startsWith("demo-") ? "샘플 데이터" : "업로드한 파일"} · {mounted ? dataset.periodLabel : ""} ·{" "}
                {dataset.rows.length.toLocaleString("ko-KR")}행 · 채널 {dataset.channels.length}개 · 상품 {dataset.products.length}개
              </p>
            </div>
            <button onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview} className={btn.secondary}>
              {showPreview ? "미리보기 닫기" : "원본 미리보기"}
            </button>
          </div>
          {showPreview && (
            <div className="mt-5">
              <DataTable rows={dataset.rows} derived={dataset.derived} />
            </div>
          )}
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="upload-title" className="min-w-0">
          <h2 id="upload-title" className="mb-3 text-card font-bold text-ink">
            내 파일 올리기
          </h2>
          <UploadPanel />
        </section>

        <section aria-labelledby="sample-title" className="min-w-0">
          <h2 id="sample-title" className="mb-3 text-card font-bold text-ink">
            샘플 데이터
          </h2>
          <Panel as="div">
            <ul className="divide-y divide-line">
              {demos.map((ds) => {
                const active = dataset?.id === ds.id;
                return (
                  <li key={ds.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-semibold text-ink">
                        {ds.name}
                        {active && <span className="ml-2 text-caption font-semibold text-brand">보는 중</span>}
                      </p>
                      <p className="mt-1 line-clamp-2 text-meta text-ink-soft">{ds.description}</p>
                    </div>
                    {active ? (
                      <Link href="/dashboard" className={btn.secondary}>
                        대시보드
                      </Link>
                    ) : (
                      <button onClick={() => startAnalysis(ds)} className={btn.secondary}>
                        분석하기
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </section>
      </div>

      <Panel className="mt-6" aria-labelledby="history-title">
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
    </>
  );
}
