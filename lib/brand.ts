/** 미래에이아이랩(Mirae AI Lab) 브랜드 상수 — 이 데모의 제작 주체 표기에 사용한다. */
export const BRAND = {
  company: "미래에이아이랩",
  companyEn: "MIRAE AI LAB",
  product: "InsightAI",
  productTagline: "AI 데이터 분석·예측 SaaS",
  credit: "미래에이아이랩이 제작한 AI 분석 SaaS 레퍼런스입니다.",
  user: {
    name: "김팀장",
    display: "미래에이아이랩 김팀장님",
    short: "미래에이아이랩 김팀장",
    initial: "김",
    role: "데이터 분석팀",
  },
  /** 제공받은 원본 로고에서 추출한 자산 (배경 제거 완료) */
  logo: {
    /** 가로형 전체 로고 767×160 */
    full: "/brand/mirae-ai-lab-logo.png",
    fullRatio: 767 / 160,
    /** 심볼(M 마크) 236×160 */
    symbol: "/brand/mirae-ai-lab-symbol.png",
    symbolRatio: 236 / 160,
  },
} as const;
