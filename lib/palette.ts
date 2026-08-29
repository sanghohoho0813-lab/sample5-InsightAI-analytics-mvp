/**
 * 서비스 전반에서 쓰는 다색 액센트 팔레트.
 * 블루 단색 위주에서 벗어나되 톤(채도·명도)을 맞춰 서로 어울리도록 구성했다.
 * base  — 밝은 표면(카드) 위 아이콘/텍스트
 * light — 어두운 표면(사이드바) 위 아이콘
 * soft  — 밝은 표면 위 칩 배경
 */
export const HUES = {
  blue:   { base: "#1478ff", light: "#6aa9ff", soft: "#e8f1ff" },
  cyan:   { base: "#12a9bf", light: "#4fd6e6", soft: "#e0f6fa" },
  mint:   { base: "#2fa36b", light: "#5fc994", soft: "#e5f6ed" },
  amber:  { base: "#d1892c", light: "#efb663", soft: "#fdf1df" },
  coral:  { base: "#dd6350", light: "#f28e79", soft: "#fdebe7" },
  violet: { base: "#7360e8", light: "#a598f5", soft: "#efecfe" },
  rose:   { base: "#c9558c", light: "#ec8ab8", soft: "#fceaf2" },
  slate:  { base: "#5f6570", light: "#a8aeb9", soft: "#eff0f3" },
} as const;

export type HueName = keyof typeof HUES;

/** 차트 시리즈 순서 — 인접 색이 서로 구분되도록 배열했다. */
export const CHART_SERIES: HueName[] = ["blue", "cyan", "violet", "amber", "mint", "coral", "rose"];

export const chartColors = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => HUES[CHART_SERIES[i % CHART_SERIES.length]].base);
