"use client";

/** 공통 커스텀 툴팁 컨테이너 */
export default function ChartTooltip({
  label,
  rows,
  note,
  noteTone = "negative",
}: {
  label?: string;
  rows: { name: string; value: string; color?: string }[];
  /** 아래에 덧붙이는 한 줄(예: 그날의 급변) */
  note?: string;
  noteTone?: "negative" | "positive";
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
      {note && <p className={`mt-2 max-w-[240px] border-t border-line pt-2 font-semibold ${noteTone === "negative" ? "text-negative" : "text-positive"}`}>{note}</p>}
    </div>
  );
}
