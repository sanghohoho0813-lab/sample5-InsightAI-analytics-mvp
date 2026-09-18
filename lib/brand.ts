/** 미래에이아이랩(Mirae AI Lab) 브랜드 상수 — 이 데모의 제작 주체 표기에 사용한다. */
export const BRAND = {
  company: "미래에이아이랩",
  /** CTA 등 짧게 부를 때 쓰는 표기 */
  companyShort: "미래AI랩",
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
  /**
   * 외부 링크 — 여기만 고치면 샘플 전체 CTA에 반영된다.
   * (컴포넌트 props로도 개별 덮어쓸 수 있다: consultHref / samplesHref / homeHref)
   */
  links: {
    /** 메인 CTA — 우리 회사도 만들어보기 */
    consult: "https://miraeailab.com/business-diagnosis",
    /** 다른 샘플 보기 */
    samples: "https://miraeailab.com/business-services",
    /** 미래AI랩 홈페이지 */
    home: "https://miraeailab.com/",
  },

  /** 제공받은 원본 로고에서 추출한 자산 (배경 제거 완료) */
  logo: {
    /** 가로형 전체 로고 767×160 */
    full: "/brand/mirae-ai-lab-logo.png",
    /** 어두운 배경(사이드바)용 밝은 워드마크 */
    fullLight: "/brand/mirae-ai-lab-logo-light.png",
    fullRatio: 767 / 160,
    /** 심볼(M 마크) 236×160 */
    symbol: "/brand/mirae-ai-lab-symbol.png",
    symbolRatio: 236 / 160,
  },
} as const;
