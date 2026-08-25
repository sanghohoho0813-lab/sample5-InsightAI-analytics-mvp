"use client";

import { useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import AnomalyCard from "@/components/AnomalyCard";
import { useApp } from "@/lib/store";
import { detectAnomalies } from "@/lib/anomaly-engine";
import { Severity } from "@/lib/types";

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};
const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-negative",
  warning: "bg-warning",
  info: "bg-brand",
};

export default function AnomaliesPage() {
  const { dataset, filters } = useApp();

  const anomalies = useMemo(
    () => (dataset ? detectAnomalies(dataset.rows, filters) : []),
    [dataset, filters.rangeDays]
  );

  if (!dataset) {
    return (
      <>
        <PageHeader subtitle="비정상 변화를 자동으로 감지합니다" />
        <EmptyState />
      </>
    );
  }

  const counts = anomalies.reduce(
    (acc, a) => ({ ...acc, [a.severity]: (acc[a.severity] ?? 0) + 1 }),
    {} as Record<Severity, number>
  );

  return (
    <>
      <PageHeader subtitle={`${dataset.name} · 최근 ${filters.rangeDays}일에서 감지된 비정상 변화`} />
      <FilterBar dataset={dataset} />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["critical", "warning", "info"] as Severity[]).map((s) => (
          <span key={s} className="card flex items-center gap-2 px-3.5 py-2 text-[12.5px]">
            <span className={`h-2 w-2 rounded-full ${SEVERITY_DOT[s]}`} />
            <span className="text-ink-soft">{SEVERITY_LABEL[s]}</span>
            <span className="tabular font-bold">{counts[s] ?? 0}</span>
          </span>
        ))}
      </div>

      {anomalies.length === 0 ? (
        <div className="card p-10 text-center animate-fade-up">
          <p className="text-[14px] font-semibold">이 기간에는 특이한 변화가 감지되지 않았습니다</p>
          <p className="mt-1 text-[12.5px] text-ink-dim">기간을 넓히거나 다른 채널을 선택해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {anomalies.map((a, i) => (
            <AnomalyCard key={a.id} anomaly={a} delay={i * 50} />
          ))}
        </div>
      )}

      <p className="mt-5 text-[11.5px] leading-relaxed text-ink-dim">
        감지 기준: 전일 대비 ±30% 이상 변화 또는 최근 7일 평균 대비 ±2 표준편차 이탈.
        채널 단위까지 검사해 원인 채널을 함께 표시합니다.
      </p>
    </>
  );
}
