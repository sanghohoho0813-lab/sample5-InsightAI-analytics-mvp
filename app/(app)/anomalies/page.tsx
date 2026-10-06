"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import AnomalyList from "@/components/AnomalyList";
import { Panel } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { ANOMALY_MIN_DAYS } from "@/lib/anomaly-engine";
import { anomaliesFor } from "@/lib/dataset-meta";
import { recentAlerts } from "@/lib/notifications";
import { Severity } from "@/lib/types";
import { SEVERITY_META, btn } from "@/lib/ui";

type Tab = "all" | Severity;

export default function AnomaliesPage() {
  const { ready, dataset, filters, readIds, markRead } = useApp();
  const [tab, setTab] = useState<Tab>("all");

  const anomalies = useMemo(() => (dataset ? anomaliesFor(dataset, filters) : []), [dataset, filters]);
  const read = useMemo(() => new Set(readIds), [readIds]);
  // '새로움'은 확인이 필요한 등급(위험·주의)에만 단다.
  const unreadIds = useMemo(
    () => new Set(anomalies.filter((a) => a.severity !== "info" && !read.has(a.id)).map((a) => a.id)),
    [anomalies, read]
  );

  if (!ready) return <PageSkeleton />;
  if (!dataset) {
    return (
      <>
        <PageHeader title="이상 감지" />
        <EmptyState />
      </>
    );
  }

  const counts = anomalies.reduce(
    (acc, a) => ({ ...acc, [a.severity]: acc[a.severity] + 1 }),
    { critical: 0, warning: 0, info: 0 } as Record<Severity, number>
  );
  const shown = tab === "all" ? anomalies : anomalies.filter((a) => a.severity === tab);
  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "all", label: "전체", count: anomalies.length },
    { value: "critical", label: SEVERITY_META.critical.label, count: counts.critical },
    { value: "warning", label: SEVERITY_META.warning.label, count: counts.warning },
    { value: "info", label: SEVERITY_META.info.label, count: counts.info },
  ];

  const markAll = () => markRead([...unreadIds, ...recentAlerts(dataset).map((a) => a.id)]);

  return (
    <>
      <PageHeader
        title="이상 감지"
        description={
          anomalies.length === 0
            ? new Set(dataset.rows.map((r) => r.date)).size < ANOMALY_MIN_DAYS
              ? `급증·급감을 찾으려면 ${ANOMALY_MIN_DAYS}일 이상의 데이터가 필요합니다.`
              : "이 범위에서는 감지된 변화가 없습니다."
            : `${anomalies.length}건 감지 · 위험 ${counts.critical}건, 주의 ${counts.warning}건${unreadIds.size ? ` · 미확인 ${unreadIds.size}건` : ""}`
        }
        actions={
          unreadIds.size > 0 ? (
            <button onClick={markAll} className={btn.secondary}>
              모두 확인 처리
            </button>
          ) : undefined
        }
      />
      <FilterToolbar dataset={dataset} />

      <Panel>
        <div className="flex gap-1 overflow-x-auto border-b border-line px-3 md:px-4" role="tablist" aria-label="등급">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              className={`relative min-h-12 whitespace-nowrap px-3 text-sub font-semibold transition-colors ${
                tab === t.value ? "text-ink" : "text-ink-dim hover:text-ink-soft"
              }`}
            >
              {t.label} <span className="tabular text-ink-dim">{t.count}</span>
              {tab === t.value && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-brand" aria-hidden />}
            </button>
          ))}
        </div>
        <AnomalyList
          anomalies={shown}
          unreadIds={unreadIds}
          onRead={(id) => markRead([id])}
          empty="이 등급에 해당하는 변화가 없습니다."
        />
      </Panel>

      <p className="mt-4 text-meta text-ink-dim">
        감지 기준: 전일 대비 ±30% 이상, 또는 직전 7일 평균에서 크게 벗어난 날. 같은 날 함께 움직인 지표는 한 건으로 묶고, 급감 직후의 반등은 따로 알리지 않습니다.
      </p>
    </>
  );
}
