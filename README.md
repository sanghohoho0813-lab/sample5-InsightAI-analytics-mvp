# InsightAI — AI 데이터 분석·예측 반응형 SaaS MVP

> **미래에이아이랩(MIRAE AI LAB) 제작 레퍼런스**

**데이터를 넣으면, 무엇이 변했고 무엇을 해야 하는지 알려주는** 분석 SaaS MVP입니다.
대상은 분석가가 없는 중소기업의 대표·운영·마케팅 담당자입니다.
화면마다 **답(무엇이 변했나) → 이유 → 다음 행동** 순서로 정보를 놓습니다.

## 핵심 흐름 (Golden Path)

1. **데이터** — 샘플 데이터를 고르거나 CSV·XLSX를 올립니다(미리보기 확인 → 분석 시작). `예시 CSV 내려받기`로 업로드 경로도 바로 체험할 수 있습니다.
2. **대시보드** — 이번 범위 요약(매출 변화 · 왜 변했나 · 확인이 필요한 변화 · 다음 행동), 핵심 지표 5개, 추이, 이상치, 채널 비중, 인사이트, 7일 예측을 봅니다.
3. **드릴다운** — 지표를 누르면 추이 차트가 바뀌고, 채널을 누르면 그 채널로 범위가 좁혀집니다. 인사이트의 `관련 데이터 보기`, 이상치의 `이 시점 전후 분석 보기`는 분석 화면으로 필터를 걸고 이동합니다.
4. **보고서 저장** — `이 범위를 보고서로 저장`(대시보드) 또는 보고서 화면에서 제목을 붙여 저장합니다. 저장 시점의 계산 결과를 스냅샷으로 보관합니다.
5. **다시 보기** — 보고서 목록·상세(`/reports?id=…`, 새로고침·딥링크 가능), PDF 저장, 삭제. 데이터 화면의 **분석 기록**에서 이전 분석(업로드 파일 포함)을 다시 엽니다.

### 저장되는 상태 (localStorage, 키 접두어 `insightai.`)

| 키 | 내용 |
|---|---|
| `activeDataset` | 지금 분석 중인 데이터셋 id |
| `history` | 분석 기록 — 분석 시점의 실제 핵심 발견·매출 변화율·주의 이상치 수 |
| `uploads` | 업로드 원본(최근 3개, 용량 초과 시 오래된 것부터 정리 → 복원 불가 기록은 `원본 없음`으로 표시) |
| `reports` | 저장한 보고서 스냅샷 |
| `readNotifications` | 확인 처리한 이상치 id (사이드바·하단 탭 미확인 배지) |
| `settings` | 기본 분석 기간(7/30/90일) |

설정 → **데모 초기화**는 위 키를 모두 지우고 샘플 데이터로 다시 시작합니다.

## 라우팅

| 경로 | 화면 |
|---|---|
| `/` | `/dashboard`로 리다이렉트 |
| `/dashboard` | 대시보드 — 어느 주소로 처음 들어와도 샘플 데이터가 연결됨 |
| `/anomalies` | 이상 감지 — 등급 탭, 미확인 표시, 모두 확인 처리 |
| `/insights` | 인사이트 + 실행 제안 |
| `/analytics` | 분석 — 지표 추이 + 채널·상품·고객 유형 분해(`?metric=` 딥링크) |
| `/forecast` | 예측 — 다음 7일 매출·주문·고객 |
| `/reports` | 보고서 목록 / `?id=` 상세 |
| `/data` · `/ai` · `/settings` | 작업 공간 — 데이터·기록, 데이터 질의, 설정 |
| `/more` | 모바일 더보기 |
| `/intro` | 서비스 소개 |
| `/notifications` · `/explore` | 통합된 이전 메뉴 → `/anomalies` · `/analytics`로 리다이렉트 |

## 내비게이션

- 데스크톱 사이드바: 핵심 6개(대시보드·이상 감지·인사이트·분석·예측·보고서) + 작업 공간 3개(데이터·데이터 질의·설정). 아이콘은 단색, 활성 항목만 브랜드 블루. 배지는 **미확인 이상치 수** 하나만.
- 상단 바: 현재 데이터 · `데모` 표기 · 오늘 날짜·요일·시각(분 단위). 페이지 제목과 대표 행동은 본문 `PageHeader`에 한 번만.
- 필터(기간·채널·상품)는 데이터를 보는 화면의 본문 상단에만 둡니다. 기본값과 다르면 `초기화`가 나타납니다.
- 모바일 하단 탭 5개: 홈 · 이상 감지 · 인사이트 · 보고서 · 더보기.

## 디자인 시스템

모든 값은 `app/globals.css`의 `@theme` 토큰입니다.

| 구분 | 토큰 |
|---|---|
| 색상 | 브랜드 블루 `brand #1478ff`(+dark/light/soft) · 보조 틸 `accent #0f9fb3`(예측·비교 시리즈 전용) · 뉴트럴(canvas/surface/line/ink/nav) · 상태 `positive / warning / negative` |
| 타입 스케일(360px 기준) | `caption 13` · `meta 14` · `sub 15` · `body 16` · `lead 17` · `card 18` · `title 22` · `page 28` · `kpi 28` · `display 40` — 768px 이상에서 `title 24 · page 32 · kpi 30 · display 52` |
| 모서리 | `rounded-control 10` · `rounded-card 14` · `rounded-panel 20` |
| 그림자 | `shadow-subtle` · `shadow-raised` · `shadow-overlay` |
| 간격 | 4/8px 리듬(gap 2·3·4·6·8) |
| 한국어 | `word-break: keep-all; overflow-wrap: break-word` 전역 적용 |

원칙
- 메뉴·지표마다 다른 색을 칠하지 않습니다. 색은 **브랜드(선택·행동)**와 **상태(좋음·주의·위험)**에만 씁니다. 상태는 항상 텍스트 라벨(위험·주의·참고)과 함께 표시합니다.
- 패널 안에 패널을 넣지 않습니다(카드 깊이 1). 목록은 구분선으로 나눕니다.
- 버튼 위계는 `lib/ui.ts`의 `btn.primary / secondary / quiet / danger` 네 가지. **primary는 화면당 하나.**
- 차트 색은 `lib/palette.ts` — 단일 지표는 브랜드 블루, 이전 기간은 옅은 블루 점선, 예측은 틸, 범주형은 블루 명도 단계 + 뉴트럴.
- 장식용 그라데이션·글로우·카운트업·"AI" 반짝이 아이콘을 쓰지 않습니다.

## 정직한 데모 표기

- 상단 바 `데모` 배지, 분석 오버레이·인사이트·설정에 **규칙 기반 분석 엔진**임을 표시합니다.
- 이상치 감지 규칙(전일 대비 ±30% / 7일 평균 대비 ±2σ)을 화면에 공개합니다.
- 예측은 "최근 14일 추세 기반 단순 모델 · 추정치", 실행 제안 효과는 "예상 효과(추정)"로 표기합니다.
- 고객 유형별 금액은 "고객 수 비율로 나눈 추정치"로 표기하고, 원본에 없는 고객 유형별 전환율은 계산하지 않습니다.
- 업로드 파일은 서버로 전송되지 않고 브라우저에서만 처리됩니다.

## 샘플 브릿지 CTA

`components/SampleBridgeCTA.tsx` 하나로 관리합니다. 핵심 작업 중에는 외부 CTA를 띄우지 않고,
**흐름을 다 본 지점**에서만 노출합니다: 대시보드 하단, 저장된 보고서 상세 하단, 모바일 더보기, 서비스 소개.
노출 조건은 `components/AppFooter.tsx`에 있습니다.

| 수정 대상 | 위치 |
|---|---|
| 링크 주소 (상담·다른 샘플·홈페이지) | `lib/brand.ts` → `BRAND.links` |
| CTA 문구 (배지·헤드라인·설명·버튼) | `components/SampleBridgeCTA.tsx` → `CTA_COPY` |
| 페이지별 링크 덮어쓰기 | `<SampleBridgeCTA consultHref samplesHref homeHref />` props |

- 메인 CTA `우리 회사도 만들어보기` → https://miraeailab.com/business-diagnosis
- `다른 샘플 보기` → https://miraeailab.com/business-services · `미래AI랩 홈페이지` → https://miraeailab.com/
- 강조는 메인 버튼의 옅은 light sweep과 배지의 느린 glow뿐이며, `prefers-reduced-motion`에서는 꺼집니다.

## 브랜딩

- 제작 표기는 화면당 한 번: 데스크톱은 사이드바 하단 `미래에이아이랩 제작 샘플`, 모바일은 하단 한 줄 크레딧.
- 사용자 표시: **미래에이아이랩 김팀장님**(설정·보고서 작성자).
- 로고 자산: `public/brand/`(가로형·밝은 버전·심볼), 상수 `lib/brand.ts`, 컴포넌트 `components/MiraeLogo.tsx`. 파비콘은 심볼.

## 실행 · 검사

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # 프로덕션 빌드 (Vercel 배포 가능)
npm run typecheck  # TypeScript
npm run lint       # ESLint (next/core-web-vitals + next/typescript)
```

## 데모 데이터 스토리 (이커머스)

데모 데이터는 **접속한 날을 마지막 날로 하는 최근 90일**로 생성됩니다. 이벤트도 마지막 날 기준 상대 위치로 정의되어,
언제 열어도 "최근에 벌어진 일"로 읽힙니다.

- 21~15일 전: 프로모션으로 모바일 중심 매출 급증
- 11일 전: 웹사이트 트래픽 급감 / 11~7일 전 모바일 결제 이탈 증가
- 6일 전~오늘: 검색광고 전환율 개선, 객단가 상승
- 최근 2주: '비타민 세럼' 판매 가속

## 분석 엔진 · AI 구조

- `lib/analytics-engine.ts` 집계·비교 · `lib/anomaly-engine.ts` 이상치 · `lib/forecast-engine.ts` 예측 · `lib/insight-generator.ts` 인사이트·제안·질의 응답
- `lib/report.ts` — 대시보드 요약(`summarize`)과 보고서 스냅샷(`buildReport`)을 같은 계산으로 만듭니다.
- `lib/ai.ts` — 서버에 `AI_API_KEY`가 있으면 `/api/ai`로 LLM을 호출하고, 없으면 규칙 기반 엔진으로 답합니다.

## 데이터 구조 (Supabase)

`supabase/schema.sql`에 users / datasets / dataset_rows / analyses / insights / anomalies / forecasts / reports / ai_queries
스키마가 정의되어 있습니다. 데모 모드에서는 브라우저 localStorage로 동작합니다.

## 디렉터리

```
app/(app)/      dashboard, anomalies, insights, analytics, forecast, reports, data, ai, settings, more
app/intro/      서비스 소개
components/     PageHeader, Panel, FilterToolbar, KpiStrip, AnomalyList, InsightList,
                Sidebar, TopBar, MobileNav, DateLine, DateRangePicker, DataTable, UploadPanel,
                AnalysisOverlay, ToastStack, EmptyState, PageSkeleton, AppFooter,
                SampleBridgeCTA, MiraeLogo, Logo, charts/
lib/            store, report, drill, nav, ui, palette, brand, notifications,
                analytics-engine, anomaly-engine, forecast-engine, insight-generator, ai, csv, demo-data
public/         brand/ 로고 · sample/insightai-sample.csv 업로드 예시
supabase/       schema.sql
```
