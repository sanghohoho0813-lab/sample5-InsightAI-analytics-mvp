"use client";

import { KpiResult, MetricKey } from "@/lib/types";
import { formatValue } from "@/lib/format";

export function KpiDelta({ kpi, className = "" }: { kpi: KpiResult; className?: string }) {
  const up = kpi.changePct >= 0;
  const good = kpi.invert ? !up : up;
  const isPoint = kpi.key === "conversion"; // 전환율은 %p 변화
  const flat = Math.abs(kpi.changePct) < 0.05;
  return (
    <span className={`tabular font-semibold ${flat ? "text-ink-soft" : good ? "text-positive" : "text-negative"} ${className}`}>
      {flat ? "–" : up ? "▲" : "▼"} {Math.abs(kpi.changePct).toFixed(isPoint ? 2 : 1)}
      {isPoint ? "%p" : "%"}
      <span className="sr-only">{up ? " 증가" : " 감소"}</span>
    </span>
  );
}

/**
 * 핵심 지표 5개를 하나의 띠로 — 카드 5장 대신 구분선으로 나눈다.
 * onSelect가 있으면 각 칸이 아래 추이 차트의 지표를 바꾸는 버튼이 된다.
 */
export default function KpiStrip({
  kpis,
  selected,
  onSelect,
}: {
  kpis: KpiResult[];
  selected?: MetricKey;
  onSelect?: (key: MetricKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-subtle xl:grid-cols-5">
      {kpis.map((kpi, i) => {
        const isSel = selected === kpi.key;
        const last = i === kpis.length - 1 && kpis.length % 2 === 1;
        const inner = (
          <>
            <span className={`block text-meta font-medium ${isSel ? "text-brand" : "text-ink-soft"}`}>{kpi.label}</span>
            <span className="tabular mt-1 block text-kpi font-bold tracking-tight text-ink">
              {formatValue(kpi.value, kpi.format)}
            </span>
            <span className="mt-1 flex flex-wrap items-baseline gap-x-2 text-meta">
              <KpiDelta kpi={kpi} />
              <span className="text-caption text-ink-dim">이전 기간 대비</span>
            </span>
            {isSel && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand" aria-hidden />}
          </>
        );
        const cls = `relative block bg-surface px-4 py-4 text-left md:px-5 ${last ? "col-span-2 xl:col-span-1" : ""}`;
        return onSelect ? (
          <button
            key={kpi.key}
            onClick={() => onSelect(kpi.key as MetricKey)}
            aria-pressed={isSel}
            aria-label={`${kpi.label} 추이 보기`}
            className={`${cls} transition-colors hover:bg-surface-soft`}
          >
            {inner}
          </button>
        ) : (
          <div key={kpi.key} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
