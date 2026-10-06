"use client";

import { KpiResult, MetricKey } from "@/lib/types";
import { formatValue } from "@/lib/format";

export function KpiDelta({ kpi, className = "" }: { kpi: KpiResult; className?: string }) {
  if (kpi.comparable === false) return <span className={`text-ink-dim ${className}`}>비교 없음</span>;
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
 * 증감은 이전 같은 길이 기간 대비이며, 그 기준은 페이지 설명줄에 한 번만 적는다.
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
    <div
      className={`grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-subtle ${kpis.length === 1 ? "grid-cols-1" : "grid-cols-2"} ${
        kpis.length >= 5 ? "xl:grid-cols-5" : kpis.length === 4 ? "md:grid-cols-4" : kpis.length === 3 ? "md:grid-cols-3" : ""
      }`}
    >
      {kpis.map((kpi, i) => {
        const isSel = selected === kpi.key;
        const last = kpis.length > 1 && i === kpis.length - 1 && kpis.length % 2 === 1;
        const lastSpan = kpis.length >= 5 ? "col-span-2 xl:col-span-1" : "col-span-2 md:col-span-1";
        const inner = (
          <>
            <span className={`block text-meta font-medium ${isSel ? "text-brand" : "text-ink-soft"}`}>{kpi.label}</span>
            <span className="tabular mt-1 block text-kpi font-bold tracking-tight text-ink">
              {formatValue(kpi.value, kpi.format)}
            </span>
            <span className="mt-1 block text-meta">
              <KpiDelta kpi={kpi} />
            </span>
            {isSel && <span className="absolute inset-x-0 bottom-0 h-[3px] bg-brand" aria-hidden />}
            {onSelect && <span className="sr-only">{isSel ? " · 차트에 표시 중" : " · 차트로 보기"}</span>}
          </>
        );
        const cls = `relative block bg-surface px-4 py-4 text-left md:px-5 ${last ? lastSpan : ""}`;
        return onSelect ? (
          <button
            key={kpi.key}
            onClick={() => onSelect(kpi.key as MetricKey)}
            aria-pressed={isSel}
            title={`${kpi.label} 추이 보기`}
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
