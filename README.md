# InsightAI — AI 데이터 분석·예측 반응형 SaaS MVP

> **미래에이아이랩(MIRAE AI LAB) 제작 레퍼런스**

데이터를 업로드하면 AI가 **핵심 KPI → 이상징후 → 추세 → 예측 → 인사이트 → 실행 제안**까지
한 번에 정리해주는 데이터 인사이트 SaaS MVP입니다.

**웜 아이보리 캔버스 + 그래파이트 다크 사이드바 + 다색 액센트** 구성의 라이트 Analytics UI이며,
데스크톱 고밀도 대시보드와 모바일 전용 홈(오늘의 비즈니스 요약) + 하단 네비게이션(중앙 AI 버튼)을 모두 지원합니다.

## 라우팅

| 경로 | 화면 |
|---|---|
| `/` | `/dashboard`로 리다이렉트 (대표 도메인 진입 시 바로 대시보드) |
| `/dashboard` | 홈 대시보드 — 데이터가 없으면 데모 데이터셋을 자동 연결해 빈 화면을 보이지 않음 |
| `/intro` | 서비스 소개(랜딩) — 앱 하단 크레딧에서 이동 |

## 샘플 브릿지 CTA

샘플을 다 본 사용자를 상담 / 다른 샘플 / 홈페이지로 연결하는 공통 CTA 섹션입니다.
`components/SampleBridgeCTA.tsx` 하나로 관리되며 모든 화면 하단에 동일하게 노출됩니다.

| 수정 대상 | 위치 |
|---|---|
| 링크 주소 (상담·다른 샘플·홈페이지) | `lib/brand.ts` → `BRAND.links` |
| CTA 문구 (배지·헤드라인·설명·버튼) | `components/SampleBridgeCTA.tsx` → `CTA_COPY` |
| 페이지별 링크 덮어쓰기 | `<SampleBridgeCTA consultHref samplesHref homeHref />` props |

- 메인 CTA `우리 회사도 만들어보기` → `/business-diagnosis`
- 서브 `다른 샘플 보기` → `/business-services`, `미래AI랩 홈페이지` → `/`
- 강조는 절제: 6.5초 주기의 옅은 light sweep + 5.5초 배지 glow + hover lift만 사용하고
  `prefers-reduced-motion`에서는 모두 비활성화됩니다.
- 로고 중복을 피하려고 CTA 안에는 로고를 넣지 않고, 하단 크레딧에만 작은 심볼을 둡니다.

## 브랜딩

제작 주체가 한눈에 드러나도록 미래에이아이랩 아이덴티티를 전 화면에 배치했습니다.

- 랜딩: 헤더 코브랜드 · 히어로 배지 · CTA 하단 문구 · 푸터 크레딧
- 앱: 사이드바 `BUILT BY` 락업, 상단 툴바 우측 표기, 모든 화면 하단 크레딧
- 사용자: **미래에이아이랩 김팀장님** (사이드바·툴바·설정·보고서 작성자)
- 보고서: 발행 카드에 로고 + `미래에이아이랩 제작` 배지 (PDF 저장 시에도 포함)
- 파비콘·메타데이터(`creator`/`publisher`)까지 브랜드 반영
- 브랜드 색상(#1478ff 블루 / #16bfd6 시안 / #09242d 잉크)을 앱 액센트·차트 팔레트에 적용
- 원본 자산: 제공받은 로고 파일에서 배경을 제거해 `public/brand/`에 PNG로 보관합니다.
  - `mirae-ai-lab-logo.png` (가로형 전체, 767×160)
  - `mirae-ai-lab-symbol.png` (M 심볼, 236×160) — 파비콘(`app/icon.png`)도 이 심볼로 생성
  - 상수: `lib/brand.ts` · 컴포넌트: `components/MiraeLogo.tsx`
  - 한글 워드마크는 높이 36px 이상에서 판독되므로, 더 좁은 곳(히어로 배지 등)에는 심볼만 사용합니다.

## 타이포그래피

전 화면 폰트를 기존 대비 **1.5배**로 확대했습니다(본문 12→18px, KPI 값 22→33px 등).
이에 맞춰 사이드바 폭(292px), 2행 상단 툴바, 차트 축 폭·폰트, 아이콘 크기, 테이블 최소 폭,
모바일 KPI·예측 카드의 가로 스냅 스크롤까지 재조정했습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드 (Vercel 배포 가능)
npm run typecheck  # TypeScript 검사
```

## 주요 기능

- **홈 랜딩**: `샘플 데이터 분석해보기` / `내 데이터 업로드` CTA
- **AI 분석 로딩 연출**: 데이터 구조 확인 → 이상 패턴 탐지 → 인사이트 생성 (약 3초)
- **상단 툴바**: 오늘 날짜·요일 + **초 단위 실시간 시계**, 기간 선택기(프리셋 7/30/90일 + **직접 선택 달력**), 채널·상품 필터, 보고서 생성, 알림 벨, 설정, 프로필
- **홈 대시보드(데스크톱)**: KPI 5종(카운트업+지표 아이콘), 매출 추이(일/주/월, 전기간 비교, 지점 클릭 상세), 채널 도넛, 이상징후·예측·AI 인사이트 3열
- **홈 대시보드(모바일)**: '오늘의 비즈니스 요약' 전용 레이아웃 — 날짜·실시간 시계 + 핵심 KPI 3종 + AI 핵심 인사이트 캐러셀 + 이상 징후 알림 + 예측 요약 + AI 보고서 생성 CTA
- **알림 센터**: Critical·Warning 이상징후를 알림으로 수집, 미읽음 배지(벨·하단 탭), 읽음 상태 localStorage 저장
- **이상징후**: 전일 대비 ±30% / 7일 평균 ±2σ 규칙, Critical·Warning·Info, 채널 단위 원인 표시, 카드에서 **해당 시점 구간으로 드릴다운**
- **AI 인사이트 & 실행 제안**: 채널 비중·고객 행동·ROAS·상품 성장·전환 추세 기반 규칙형 인사이트
- **예측**: 최근 7일 수준 + 직전 7일 대비 성장률 기반 다음 7일 예측, 14일 변동성 기준 신뢰구간 밴드 차트
- **AI 질의**: 자연어 질문 데모 엔진 (실데이터 계산 기반 응답)
- **데이터 관리**: CSV/XLSX 업로드(드래그&드롭, 컬럼 자동 매핑, 한글 헤더 지원), 3종 데모 데이터셋, 미리보기 테이블, 분석 히스토리
- **데이터 탐색**: 지표(매출·주문·고객·전환율·광고비) × 차원(기간·채널·상품·고객유형)
- **보고서**: Executive Summary ~ AI Recommendation 6단 구성 미리보기
- **필터**: 기간(7/30/90일 또는 직접 선택)·채널·상품 — KPI·차트·이상징후·예측·인사이트에 모두 반영
- **KPI ↔ 차트 연동**: KPI 카드를 누르면 추이 차트가 해당 지표(매출·주문·고객·전환율·객단가)로 전환
- **정렬 가능한 데이터 테이블**: 컬럼 헤더 클릭 정렬 + 고정 헤더
- **보고서 PDF 저장**: 인쇄 전용 스타일로 사이드바·툴바를 제외하고 A4에 맞춰 출력
- **접근성**: 키보드 포커스 링, `prefers-reduced-motion` 대응, 44px 터치 타깃

## 데모 데이터 스토리 (이커머스)

데모 데이터는 **접속한 날을 마지막 날로 하는 최근 90일**로 매번 생성됩니다.
스토리 이벤트도 절대 날짜가 아니라 마지막 날 기준 상대 위치로 정의되어 있어,
언제 열어도 "최근에 벌어진 일"로 읽힙니다.

- 21~15일 전: 프로모션으로 모바일 중심 매출 급증
- 11일 전: 웹사이트 트래픽 급감 / 11~7일 전 모바일 결제 이탈 증가
- 6일 전~오늘: 검색광고 전환율 개선, 객단가 상승
- 최근 2주: '비타민 세럼' 판매 가속

이 스토리가 KPI·차트·이상징후·인사이트에 일관되게 반영됩니다.

## 기술 스택

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Recharts · Lucide Icons

### 디자인 토큰

블루 단색 위주에서 벗어나 **6종 이상의 액센트**를 한 톤으로 묶었습니다(`lib/palette.ts`).
상태색(상승·주의·하락)도 같은 액센트를 재사용해 화면 전체가 하나의 색 체계로 읽힙니다.

| 역할 | 값 |
|---|---|
| 캔버스 / 카드 | `#f7f4ec` (웜 아이보리) / `#ffffff` |
| 보더 | `#e9e3d7` (강조 `#d9d1c1`) |
| 사이드바 | `#23262c` · 활성 `#2d3138` · 텍스트 `#c7ccd4` |
| 텍스트 | `#23272e` / `#5f6570` / `#8f96a1` |
| **액센트 6종+** | 블루 `#1478ff` · 시안 `#12a9bf` · 민트 `#2fa36b` · 앰버 `#d1892c` · 코랄 `#dd6350` · 바이올렛 `#7360e8` · 로즈 `#c9558c` |
| 상태 | 상승=민트 · 주의=앰버 · 하락=코랄 |

색상은 의미와 1:1로 묶여 있습니다.

- **사이드바 메뉴**: 항목마다 고유 색상 아이콘 칩 (홈=블루, 분석=바이올렛, 탐색=시안, 예측=민트, 이상감지=코랄, 알림=로즈 …)
- **KPI 카드**: 매출=블루 · 주문=바이올렛 · 고객=시안 · 전환율=민트 · 객단가=앰버 — 선택하면 추이 차트 라인·영역·툴팁이 그 색을 따라갑니다
- **인사이트 / 실행 제안**: 카테고리·우선순위별 색 구분
- **도넛·막대 차트**: 7색 카테고리 팔레트 순환

## AI 구조

화면은 `lib/ai.ts`의 `generateInsight` / `generateRecommendation` / `askDataQuestion`만 사용합니다.
서버에 `AI_API_KEY` 환경변수가 있으면 `/api/ai`를 통해 실제 LLM(Claude API)을 호출하고,
없으면 규칙 기반 **Demo Insight Engine**으로 동작합니다.

## 데이터 구조 (Supabase)

`supabase/schema.sql`에 users / datasets / dataset_rows / analyses / insights /
anomalies / forecasts / reports / ai_queries 스키마가 정의되어 있습니다.
데모 모드에서는 메모리 + localStorage(분석 히스토리)로 동작합니다.

## 디렉터리

```
app/            페이지 (랜딩, dashboard, analytics, explore, insights, ai,
                forecast, anomalies, notifications, reports, data, settings, more)
components/     MetricCard, InsightCard, AnomalyCard, ForecastCard, MobileHome,
                InsightCarousel, Sidebar, TopBar, MobileNav, DateRangePicker,
                NotificationBell, DataTable, UploadPanel, MiraeLogo, AppFooter,
                SampleBridgeCTA, LiveClock, charts/ ...
lib/            analytics-engine, anomaly-engine, forecast-engine,
                insight-generator, notifications, ai, csv, demo-data, store, brand, palette
public/brand/   미래에이아이랩 로고 (가로형 전체 · 다크배경용 밝은 버전 · 심볼, 배경 제거 PNG)
supabase/       schema.sql
```
