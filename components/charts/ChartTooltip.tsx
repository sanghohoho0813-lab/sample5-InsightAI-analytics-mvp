"use client";

/** 공통 커스텀 툴팁 컨테이너 */
export default function ChartTooltip({
  label,
  rows,
}: {
  label?: string;
  rows: { name: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2 text-meta shadow-raised">
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 text-ink-soft">
              {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />}
              {r.name}
            </span>
            <span className="tabular font-semibold text-ink">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
