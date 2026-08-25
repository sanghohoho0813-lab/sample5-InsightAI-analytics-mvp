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
    <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[18px] shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      {label && <p className="mb-1.5 font-semibold text-ink">{label}</p>}
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
