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
    <div className="rounded-xl border border-line-strong bg-navy-900/95 px-3.5 py-2.5 text-xs shadow-xl shadow-black/50 backdrop-blur-sm">
      {label && <p className="mb-1.5 font-semibold text-ink">{label}</p>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
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
