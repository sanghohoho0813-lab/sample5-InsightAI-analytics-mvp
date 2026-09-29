/** InsightAI 제품 마크 */
export default function Logo({
  size = 28,
  showText = true,
  tone = "dark",
}: {
  size?: number;
  showText?: boolean;
  /** dark = 밝은 배경용, light = 어두운 배경용 */
  tone?: "dark" | "light";
}) {
  return (
    <span className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
        <g transform="rotate(45 16 16)">
          <ellipse cx="16" cy="9.2" rx="4.4" ry="7.2" fill="#1478ff" />
          <ellipse cx="16" cy="22.8" rx="4.4" ry="7.2" fill="#1478ff" />
          <ellipse cx="9.2" cy="16" rx="7.2" ry="4.4" fill="#6aa9ff" />
          <ellipse cx="22.8" cy="16" rx="7.2" ry="4.4" fill="#6aa9ff" />
        </g>
      </svg>
      {showText && (
        <span className={`text-card font-bold tracking-tight ${tone === "light" ? "text-white" : "text-ink"}`}>
          InsightAI
        </span>
      )}
    </span>
  );
}
