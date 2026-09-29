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
import { btn } from "@/lib/ui";

export default function InsightsPage() {
  const { ready, dataset, filters } = useApp();

  const data = useMemo(() => {
    if (!dataset) return null;
    const ctx = { rows: dataset.rows, filters };
    return { insights: generateInsights(ctx), recommendations: generateRecommendations(ctx) };
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
        description="무엇이 왜 변했는지, 그리고 다음에 무엇을 하면 좋을지 정리했습니다. 수치는 모두 선택한 범위의 데이터에서 계산합니다."
      />
      <FilterToolbar dataset={dataset} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader title="발견한 변화" description={`${data.insights.length}건 · 규칙 기반 분석`} />
          <div className="mt-2">
            <InsightList insights={data.insights} />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="실행 제안" description="우선순위 순" />
            <div className="mt-2">
              <RecommendationList items={data.recommendations} />
            </div>
          </Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-dashed border-line-strong px-5 py-4">
            <p className="text-sub text-ink-soft">더 궁금한 점은 데이터에 직접 물어보세요.</p>
            <Link href="/ai" className={btn.quiet}>
              데이터 질의 →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
