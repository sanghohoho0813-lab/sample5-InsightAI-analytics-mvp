/**
 * 차트 색상 — CSS 토큰(globals.css)과 같은 값을 JS에서 쓰기 위한 사본.
 * 브랜드 블루 계열 + 보조 틸 + 뉴트럴만 사용한다. 메뉴·지표별 고유색은 두지 않는다.
 */
export const COLORS = {
  brand: "#1478ff",
  brandSoft: "#eaf2ff",
  compare: "#9dbcf0", // 이전 기간 비교선
  accent: "#0f9fb3", // 예측 시리즈
  grid: "#ebe8e1",
  positive: "#1e9a61",
  warning: "#c47d1c",
  negative: "#d44f3d",
  ink: "#1f232a",
  dim: "#858c97",
} as const;

/** 범주형 시리즈 — 명도 단계로 구분하고, 상위 2개만 채도를 준다. */
const CATEGORICAL = ["#1478ff", "#0f9fb3", "#5b8ee0", "#93b4e6", "#a7b0bd", "#c5ccd6", "#dde1e7"];

export const chartColors = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => CATEGORICAL[i % CATEGORICAL.length]);
