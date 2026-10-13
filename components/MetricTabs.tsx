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
 * 지표 선택 — 카드 줄 대신 추이 차트의 머리에 붙은 탭.
 * 매출은 위 브리핑에서 이미 크게 말했으므로 여기서는 같은 무게로 나란히 두고,
 * 고른 지표가 바로 아래 차트에 그려진다. 좁은 화면에서는 가로로 넘겨 본다.
 */
export default function MetricTabs({
  kpis,
  selected,
  onSelect,
}: {
  kpis: KpiResult[];
  selected: MetricKey;
  onSelect: (key: MetricKey) => void;
}) {
  return (
    <div
      className="-mx-5 mb-4 flex snap-x gap-1 overflow-x-auto border-b border-line px-3 md:-mx-6 md:px-4"
      role="group"
      aria-label="차트에 표시할 지표"
    >
      {kpis.map((k) => {
        const on = selected === k.key;
        return (
          <button
            key={k.key}
            onClick={() => onSelect(k.key as MetricKey)}
            aria-pressed={on}
            className="relative min-w-[8.25rem] shrink-0 snap-start rounded-t-control px-3 pb-3 pt-1 text-left transition-colors hover:bg-surface-soft"
          >
            <span className={`block text-meta font-medium ${on ? "text-brand" : "text-ink-soft"}`}>{k.label}</span>
            <span className="tabular mt-0.5 block text-card font-bold text-ink">{formatValue(k.value, k.format)}</span>
            <span className="mt-0.5 block text-caption">
              <KpiDelta kpi={k} />
            </span>
            {on && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
