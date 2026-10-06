import { ChevronDown } from "lucide-react";

/**
 * 네이티브 select(모바일에서 OS 선택창이 뜨는 장점 유지)에 앱과 같은 모양을 입힌 것.
 * active면 기본값이 아닌 상태임을 브랜드색으로 보여준다.
 */
export default function Select({
  value,
  onChange,
  label,
  options,
  active = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: { value: string; label: string }[];
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-control border bg-surface pl-3 pr-9 text-sub font-medium outline-none transition-colors hover:border-line-strong focus:border-brand ${
          active ? "border-brand/60 text-brand" : "border-line text-ink"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${active ? "text-brand" : "text-ink-dim"}`}
        aria-hidden
      />
    </div>
  );
}
