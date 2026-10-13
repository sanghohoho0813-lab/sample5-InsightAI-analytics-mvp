"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageSkeleton from "@/components/PageSkeleton";
import FilterToolbar from "@/components/FilterToolbar";
import EmptyState from "@/components/EmptyState";
import AnomalyList from "@/components/AnomalyList";
import InvestigationView from "@/components/InvestigationView";
import { Panel } from "@/components/Panel";
import { useApp } from "@/lib/store";
import { ANOMALY_MIN_DAYS } from "@/lib/anomaly-engine";
import { uniqueDates } from "@/lib/analytics-engine";
import { anomaliesFor } from "@/lib/dataset-meta";
import { recentAlerts } from "@/lib/notifications";
import { DemoDataset, Filters, Severity } from "@/lib/types";
import { SEVERITY_META, btn } from "@/lib/ui";

type Tab = "all" | Severity;

/** 조사 화면에서 열 이상치 — 지금 범위에서 먼저 찾고, 없으면 전체 기간에서 찾는다(다른 범위에서 저장한 링크 대비). */
function findAnomaly(ds: DemoDataset, filters: Filters, id: string) {
  const inScope = anomaliesFor(ds, filters).find((a) => a.id === id);
  if (inScope) return inScope;
  const dates = uniqueDates(ds.rows);
  const all: Filters = { ...filters, preset: "custom", rangeDays: dates.length, range: { start: dates[0], end: dates[dates.length - 1] } };
  return anomaliesFor(ds, all).find((a) => a.id === id) ?? null;
}

function Investigation({ id, from }: { id: string; from: string | null }) {
  const { ready, dataset, filters } = useApp();
  const anomaly = useMemo(() => (dataset ? findAnomaly(dataset, filters, id) : null), [dataset, filters, id]);
  if (!ready) return <PageSkeleton />;
  if (!dataset) {
    return (
      <>
        <PageHeader title="변화 조사" />
        <EmptyState />
      </>
    );
  }
  if (!anomaly) {
    return (
      <>
        <PageHeader title="이 변화를 찾을 수 없습니다" description="데이터나 범위가 바뀌어 지금은 감지되지 않는 변화입니다." />
        <Link href="/anomalies" className={btn.secondary}>
          이상 감지 목록으로
        </Link>
      </>
    );
  }
  return <InvestigationView anomaly={anomaly} from={from && from.startsWith("/") ? from : null} />;
}

function AnomaliesView() {
  const params = useSearchParams();
  const id = params.get("id");
  if (id) return <Investigation id={id} from={params.get("from")} />;
  return <AnomalyLibrary />;
}

export default function AnomaliesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AnomaliesView />
    </Suspense>
  );
}

function AnomalyLibrary() {
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
            : `${anomalies.length}건 · 위험 ${counts.critical}건, 주의 ${counts.warning}건${unreadIds.size ? ` · 미확인 ${unreadIds.size}건` : ""} · 누르면 원인 조사 화면으로 갑니다`
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
        감지 기준: 평소 수준(직전 7일 중앙값)과 최근 4주 같은 요일 수준 모두에서 20% 이상(전환율·객단가는 15%) 벗어난 날.
        주말처럼 원래 반복되는 패턴과 프로모션이 끝나 평소로 돌아온 날은 알리지 않고, 며칠 이어진 변화는 한 건으로 묶습니다.
      </p>
    </>
  );
}
