"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import { InsightList, RecommendationList } from "@/components/InsightList";
import { useActionProgress } from "@/components/BriefingPanel";
import { Panel, PanelHeader } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { generateInsights, generateRecommendations } from "@/lib/insight-generator";
import { anomaliesFor, insightContext } from "@/lib/dataset-meta";
import { comparisonLabel } from "@/lib/report";
import { btn } from "@/lib/ui";

export default function InsightsPage() {
  const { ready, dataset, filters } = useApp();
  // 좁은 화면에서는 '발견'과 '할 일'을 나눠 본다(할 일이 긴 발견 목록 아래에 묻히지 않게).
  const [view, setView] = useState<"insights" | "actions">("insights");

  const data = useMemo(() => {
    if (!dataset) return null;
    const ctx = insightContext(dataset, filters);
    return { insights: generateInsights(ctx), recommendations: generateRecommendations(ctx, anomaliesFor(dataset, filters)) };
  }, [dataset, filters]);
  const progress = useActionProgress(data?.recommendations ?? []);

  if (!ready) return <PageSkeleton />;
  if (!dataset || !data) {
    return (
      <>
        <PageHeader title="인사이트" />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="인사이트"
        description={comparisonLabel(dataset, filters)}
      />
      <FilterToolbar dataset={dataset} />

      <div className="mb-4 grid grid-cols-2 rounded-control border border-line bg-surface-soft p-0.5 lg:hidden" role="group" aria-label="보기">
        {(
          [
            ["insights", "발견한 변화", data.insights.length],
            ["actions", "할 일", data.recommendations.length - progress.done],
          ] as const
        ).map(([v, label, n]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`min-h-11 rounded-[8px] text-sub font-semibold transition-colors ${
              view === v ? "bg-surface text-ink shadow-subtle" : "text-ink-dim"
            }`}
          >
            {label} <span className="tabular text-ink-dim">{n}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel className={view === "insights" ? "" : "hidden lg:block"}>
          <PanelHeader title="발견한 변화" description={`${data.insights.length}건 · 모두 원본 데이터에서 계산한 값입니다`} />
          <div className="mt-2">
            <InsightList insights={data.insights} />
          </div>
        </Panel>

        <div className={`space-y-6 ${view === "actions" ? "" : "hidden lg:block"}`}>
          <Panel>
            <PanelHeader
              title="실행 제안"
              description={
                progress.done > 0
                  ? `${progress.total}개 중 ${progress.done}개 완료 · 동그라미를 눌러 완료를 표시합니다`
                  : "발견에서 나온 할 일 · 했으면 동그라미를 눌러 완료로 표시합니다"
              }
            />
            <div className="mt-2">
              <RecommendationList items={data.recommendations} />
            </div>
          </Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-line-strong px-5 py-4">
            <p className="text-sub text-ink-soft">이 결과에 대해 더 궁금한 점은 데이터에 물어보세요.</p>
            <Link href="/ai" className={btn.quiet}>
              데이터에 질문하기 →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
