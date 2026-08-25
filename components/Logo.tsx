/** InsightAI 브랜드 마크 — 4엽 블루 심볼 */
export default function Logo({ size = 30, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
        <g transform="rotate(45 16 16)">
          <ellipse cx="16" cy="9.2" rx="4.4" ry="7.2" fill="#1478ff" />
          <ellipse cx="16" cy="22.8" rx="4.4" ry="7.2" fill="#1478ff" />
          <ellipse cx="9.2" cy="16" rx="7.2" ry="4.4" fill="#60a5fa" />
          <ellipse cx="22.8" cy="16" rx="7.2" ry="4.4" fill="#60a5fa" />
        </g>
      </svg>
      {showText && (
        <span className="text-[25.5px] font-bold tracking-tight text-ink">
          Insight<span className="text-brand">AI</span>
        </span>
      )}
    </span>
  );
}
