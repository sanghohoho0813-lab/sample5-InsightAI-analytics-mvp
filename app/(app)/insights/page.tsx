"use client";

import { useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import { InsightList, RecommendationList } from "@/components/InsightList";
import { Panel, PanelHeader } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { generateInsights, generateRecommendations } from "@/lib/insight-generator";
import { anomaliesFor, insightContext } from "@/lib/dataset-meta";
import { comparisonLabel } from "@/lib/report";
import { btn } from "@/lib/ui";

export default function InsightsPage() {
  const { ready, dataset, filters } = useApp();

  const data = useMemo(() => {
    if (!dataset) return null;
    const ctx = insightContext(dataset, filters);
    return { insights: generateInsights(ctx), recommendations: generateRecommendations(ctx, anomaliesFor(dataset, filters)) };
  }, [dataset, filters]);

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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader title="발견한 변화" description={`${data.insights.length}건 · 모두 원본 데이터에서 계산한 값입니다`} />
          <div className="mt-2">
            <InsightList insights={data.insights} />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="실행 제안" description="발견에서 나온 할 일 · 누르면 관련 화면으로 갑니다" />
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
