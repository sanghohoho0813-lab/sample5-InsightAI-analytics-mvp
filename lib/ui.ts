/**
 * 공통 컨트롤 클래스 — 버튼 위계는 3단계만 둔다.
 * primary: 화면당 1개 · secondary: 보조 행동 · quiet: 텍스트 링크형
 */
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 text-sub font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const btn = {
  primary: `${base} bg-brand text-white hover:bg-brand-dark`,
  secondary: `${base} border border-line-strong bg-surface text-ink hover:border-ink-dim`,
  quiet: "inline-flex min-h-11 items-center gap-1 whitespace-nowrap text-sub font-semibold text-brand transition-colors hover:text-brand-dark",
  danger: `${base} border border-negative/40 bg-surface text-negative hover:bg-negative-soft`,
};

export const field =
  "h-11 min-w-0 rounded-control border border-line bg-surface px-3 text-sub font-medium text-ink outline-none transition-colors hover:border-line-strong focus:border-brand";

/** 상태 표식 — 색만으로 구분하지 않도록 항상 텍스트 라벨과 함께 쓴다. */
export const SEVERITY_META = {
  critical: { label: "위험", dot: "bg-negative", text: "text-negative", soft: "bg-negative-soft" },
  warning: { label: "주의", dot: "bg-warning", text: "text-warning", soft: "bg-warning-soft" },
  info: { label: "참고", dot: "bg-ink-dim", text: "text-ink-soft", soft: "bg-surface-soft" },
} as const;
