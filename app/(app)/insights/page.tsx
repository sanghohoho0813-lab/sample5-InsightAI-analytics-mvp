"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bot, Sparkles, Target } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import InsightCard from "@/components/InsightCard";
import RecommendationCard from "@/components/RecommendationCard";
import SectionHeader from "@/components/SectionHeader";
import { useApp } from "@/lib/store";
import { generateInsights, generateRecommendations } from "@/lib/insight-generator";

export default function InsightsPage() {
  const { dataset, filters } = useApp();

  const data = useMemo(() => {
    if (!dataset) return null;
    const ctx = { rows: dataset.rows, filters };
    return {
      insights: generateInsights(ctx),
      recommendations: generateRecommendations(ctx),
    };
  }, [dataset, filters]);

  if (!dataset || !data) {
    return (
      <>
        <PageHeader subtitle="AI가 발견한 핵심 인사이트입니다" />
        <EmptyState />
      </>
    );
  }

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · AI가 발견한 핵심 인사이트입니다`} />
      <FilterBar dataset={dataset} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionHeader title="핵심 인사이트" icon={<Sparkles className="h-6 w-6 text-brand" />} />
          <div className="space-y-2.5">
            {data.insights.length === 0 ? (
              <div className="card p-6 text-center text-[19.5px] text-ink-dim">
                이 기간에는 뚜렷한 변화가 발견되지 않았습니다. 기간을 넓혀보세요.
              </div>
            ) : (
              data.insights.map((ins, i) => <InsightCard key={ins.id} insight={ins} delay={i * 70} />)
            )}
          </div>

          <div className="card mt-4 flex items-center gap-3.5 p-4 animate-fade-up">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-brand/30">
              <Bot className="h-7 w-7 text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[20px] font-semibold">데이터에 직접 물어보세요</p>
              <p className="truncate text-[18px] text-ink-dim">&ldquo;지난달 매출이 왜 떨어졌어?&rdquo; 같은 질문에 AI가 답합니다</p>
            </div>
            <Link
              href="/ai"
              className="shrink-0 rounded-xl bg-brand px-3.5 py-2 text-[19px] font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              AI 질의
            </Link>
          </div>
        </section>

        <section>
          <SectionHeader title="AI 실행 제안" icon={<Target className="h-6 w-6 text-positive" />} />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            {data.recommendations.map((rec, i) => (
              <RecommendationCard key={rec.id} rec={rec} delay={i * 70} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
