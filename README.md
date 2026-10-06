# InsightAI — AI 데이터 분석·예측 반응형 SaaS MVP

> **미래에이아이랩(MIRAE AI LAB) 제작 레퍼런스**

**데이터를 넣으면, 무엇이 변했고 무엇을 해야 하는지 알려주는** 분석 SaaS MVP입니다.
대상은 분석가가 없는 중소기업의 대표·운영·마케팅 담당자입니다.
화면마다 **답(무엇이 변했나) → 이유 → 다음 행동** 순서로 정보를 놓습니다.

## 핵심 흐름 (Golden Path)

1. **데이터** — 샘플 데이터를 고르거나 CSV·XLSX를 올립니다(미리보기 확인 → 분석 시작). `예시 CSV 내려받기`로 업로드 경로도 바로 체험할 수 있습니다.
2. **대시보드** — 이번 범위 요약(매출 변화 · 왜 변했나 · 확인이 필요한 변화 · 다음 행동)을 먼저 보고, 각 항목의 바로가기(`웹사이트만 보기`, `그날 전후 분석 보기`, `실행 제안 모두 보기`)로 바로 다음 화면에 들어갑니다. 아래에 핵심 지표, 추이, 이상치, 채널 비중, 인사이트, 7일 예측이 이어집니다.
   - **왜 변했나**는 기여도 분석입니다: 매출 증감분을 채널(채널을 골랐으면 상품)별로 나눠 변화를 가장 많이 만든 항목을 보여줍니다.
3. **드릴다운** — 지표를 누르면 추이 차트가 바뀌고, 채널을 누르면 그 채널로 범위가 좁혀집니다. 인사이트의 `관련 데이터 보기`, 이상치의 `그날 전후 분석 보기`는 분석 화면으로 범위를 좁혀 이동합니다.
   - 분석 화면은 무엇을 보러 왔는지 제목으로 보여주고(예: `웹사이트 매출 등 3개 지표 급감`), 발생일을 차트에 표시하며, 차트를 먼저 보여줍니다.
   - `대시보드로 돌아가기` 또는 브라우저 뒤로 가기로 돌아가면 **드릴 전 범위로 자동 복원**됩니다.
4. **보고서 저장** — `이 범위를 보고서로 저장`(대시보드) 또는 보고서 화면에서 제목을 붙여 저장합니다. 저장 시점의 계산 결과를 스냅샷으로 보관합니다.
5. **다시 보기** — 보고서 목록·상세(`/reports?id=…`, 새로고침·딥링크 가능), 제목 수정, `이 범위로 대시보드 열기`, PDF 저장, 삭제(토스트에서 `되돌리기`). 데이터 화면의 **분석 기록**에서 이전 분석(업로드 파일 포함)을 다시 엽니다. 같은 파일을 다시 올리면 기존 사본을 대체하고 기록은 계속 열립니다.
6. **데이터 질의** — 대화는 데이터셋별로 탭이 열려 있는 동안 유지되고, `대화 지우기`로 비웁니다.

예외 상태: 브랜드 404 페이지, 화면 오류 시 `다시 시도`/`데모 데이터 비우고 시작` 화면, 손상된 저장 데이터는 읽을 때 걸러냅니다.

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
- 상단 바: **데이터 전환 메뉴**(샘플 3종 · 올린 파일 · 파일 올리기) · `데모` 표기 · 오늘 날짜·요일·시각(분 단위). 페이지 제목과 대표 행동은 본문 `PageHeader`에 한 번만.
- 범위(기간·채널·상품)는 데이터를 보는 화면의 본문 상단에만 둡니다. 데스크톱은 한 줄 컨트롤, 모바일은 `최근 30일 · 전체 채널` 한 줄 요약을 누르면 **바텀시트**에서 한 번에 고르고 적용합니다. 값이 하나뿐인 차원(예: 채널 컬럼이 없는 파일)은 숨깁니다.
- 페이지 설명줄은 비교 기준을 한 줄로 보여줍니다: `최근 30일 · 이전 30일과 비교`.
- 모바일 하단 탭 5개: 홈 · 이상 감지 · 인사이트 · 보고서 · 더보기.

## 디자인 시스템

모든 값은 `app/globals.css`의 `@theme` 토큰입니다.

| 구분 | 토큰 |
|---|---|
| 색상 | 브랜드 블루 `brand #0a62db`(글자·버튼) / 로고 블루 `#1478ff`(차트 선) · 보조 틸 `accent #0f9fb3`(예측·비교 시리즈 전용) · 뉴트럴(canvas/surface/line/ink/nav) · 상태 `positive / warning / negative` — **모든 글자 색은 WCAG AA(4.5:1) 이상**, E2E에서 axe로 검사 |
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

## 정직한 데모 표기 · 계산 규칙

- 상단 바 `데모` 배지, 분석 오버레이·인사이트·설정에 **규칙 기반 분석 엔진**임을 표시합니다.
- 이상치 감지 규칙(전일 대비 ±30% / 7일 평균 대비 ±2σ)을 화면에 공개합니다.
- 예측은 "최근 14일 추세 기반 단순 모델 · 추정치", 실행 제안 효과는 "예상 효과(추정)"로 표기합니다.
- 고객 유형별 금액은 "고객 수 비율로 나눈 추정치"로 표기하고, 원본에 없는 고객 유형별 전환율은 계산하지 않습니다.
- 업로드 파일은 서버로 전송되지 않고 브라우저에서만 처리됩니다.
- **이전 기간 비교**는 같은 길이의 직전 구간이 있을 때만 합니다(예: 90일치 데이터에서 `최근 90일`은 비교하지 않음). 비교할 수 없으면 증감 대신 `비교 없음`을 표시합니다.
- **파일에 없는 컬럼**(주문 수·방문자·고객 수·광고비·채널·상품)은 내부 계산용으로만 추정하고, 그 추정치로 만든 지표·인사이트·표 열은 화면에 내지 않습니다. 업로드 미리보기에서 어떤 지표가 빠지는지 알려줍니다.
- **최소 데이터**: 이상치는 8일 이상(기간 앞 7일을 기준선으로 사용 — `최근 7일`에서도 동작), 예측은 14일 이상일 때만 계산하고, 부족하면 이유를 표시합니다.
- **이상치 정리**: 같은 날·같은 채널·같은 방향으로 함께 움직인 지표는 한 건으로 묶고(`웹사이트 매출 등 3개 지표 급감`), 급감 직후의 반등은 따로 알리지 않습니다. 상승은 `참고` 등급입니다.

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
cp .env.example .env.local   # 선택: 데이터 질의에 LLM을 쓰려면 ANTHROPIC_API_KEY 입력
npm run dev                  # http://localhost:3000

npm run check      # typecheck + lint + 단위 테스트 (커밋 전 기본)
npm run build      # 프로덕션 빌드 (Vercel 배포 가능)
npm run test:e2e   # 프로덕션 빌드를 띄워 데스크톱·모바일 E2E + 접근성 검사 (build 후 실행)
```

로컬에 Playwright 브라우저 대신 시스템 Chromium을 쓰려면 `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

## 데모 데이터 스토리 (이커머스)

데모 데이터는 **접속한 날을 마지막 날로 하는 최근 90일**로 생성됩니다. 이벤트도 마지막 날 기준 상대 위치로 정의되어,
언제 열어도 "최근에 벌어진 일"로 읽힙니다.

- 21~15일 전: 프로모션으로 모바일 중심 매출 급증
- 11일 전: 웹사이트 트래픽 급감 / 11~7일 전 모바일 결제 이탈 증가
- 6일 전~오늘: 검색광고 전환율 개선, 객단가 상승
- 최근 2주: '비타민 세럼' 판매 가속

## 개발자 가이드

### 구조와 데이터 흐름

```
demo-data / csv(업로드)          ← 원본 행(DataRow) — 브라우저 밖으로 나가지 않음
        │
        ▼
analytics-engine  (기간 해석 · 집계 · 이전 기간 비교 가능 여부)
anomaly-engine    (규칙 탐지 → 원인 채널 · 지표 묶기 · 반등/제자리 억제)
forecast-engine   (14일 추세 → 7일 추정)
insight-generator (인사이트 · 실행 제안 · 규칙 기반 질의 응답)
        │
        ▼
report.summarize  (답 → 이유(기여도) → 확인할 것 → 다음 행동)  ── 대시보드 · 보고서 스냅샷 · 분석 기록이 같은 함수를 쓴다
dataset-meta      (파일에 없어 추정한 필드에 기대는 지표·인사이트를 걸러냄)
        │
        ▼
store (React Context)  ←→  persist (localStorage: 검증된 읽기 · 용량 초과 대응)
        │
        ▼
화면 (app/(app)/*)      ai/client → /api/ai (선택) → Claude API
```

- **엔진은 순수 함수**입니다. React·브라우저에 의존하지 않아 단위 테스트로 규칙을 고정합니다.
- **화면의 모든 숫자는 한 계산 경로**에서 나옵니다. 대시보드 요약, 저장 보고서, 분석 기록, LLM에 보내는 데이터 요약이 `summarize`·`buildAiContext`를 공유해 서로 어긋나지 않습니다.
- **상태 경계**: 범위(기간·채널·상품)는 전역 상태이고, 드릴다운은 출발 화면과 이전 범위를 `drill`로 기억해 돌아갈 때(링크·브라우저 뒤로) 복원합니다(`components/DrillWatcher.tsx`).

### 데이터 질의 (LLM, 선택)

- 브라우저는 `/api/ai`만 호출하고 키는 서버(`ANTHROPIC_API_KEY`)에만 둡니다. 모델은 `AI_MODEL`(기본 `claude-opus-5-5`).
- 원본 행이 아니라 **화면과 같은 계산으로 만든 요약**(`lib/ai/context.ts`, 12KB 이하)만 보내고, 시스템 프롬프트로 "요약 안의 숫자만 근거로, 없는 값은 모른다고" 답하게 합니다. 질문은 `<question>` 태그로 분리해 지시 주입을 막습니다.
- 요청·응답 형식은 `lib/ai/contract.ts` 한곳에서 정의하고 서버·클라이언트가 같은 검증을 씁니다(질문 300자, 요약 크기 제한).
- 키 없음·거절(`refusal`)·호출 실패·20초 초과 시 규칙 기반 엔진으로 자연스럽게 넘어가고, 답변마다 출처(`AI 답변` / `규칙 기반 답변`)를 표시합니다.
- 인스턴스 단위 호출 제한(IP당 분당 20회). 여러 인스턴스에서 공유하려면 외부 저장소로 옮깁니다.

### 테스트

| 종류 | 위치 | 다루는 것 |
|---|---|---|
| 단위 (Vitest) | `tests/unit` | 기간 비교 규칙, 이상치 묶기·억제, 기여도 분석, 예측 최소 일수, CSV·XLSX 파싱(별칭·한글 날짜·엑셀 날짜 셀), 저장소 검증·용량 초과, AI 요청 검증, `/api/ai` 라우트(SDK 모킹: 프롬프트 구성·거절·오류·호출 제한) |
| E2E (Playwright) | `tests/e2e` | 데스크톱·모바일 각각: 첫 방문, 드릴다운 후 범위 복원, 90일 비교 불가, 보고서 저장·새로고침·이름 변경·삭제 되돌리기, 업로드 정상·오류 4종, 404·리다이렉트·손상된 저장 데이터 |
| 품질 (axe + 레이아웃) | `tests/e2e/quality.spec.ts` | 11개 화면 × 2개 뷰포트에서 WCAG 2.1 AA 심각·치명 위반 0건, 가로 넘침 0 |

테스트 데이터는 `tests/unit/fixtures.ts`의 결정적 생성기로 만들어, 각 테스트가 의도한 변화(특정 날·채널 급감 등)만 담습니다.

### CI

`.github/workflows/ci.yml` — 푸시·PR마다 typecheck → lint → 단위 테스트 → 빌드, 이어서 E2E(데스크톱·모바일·접근성). 실패 시 Playwright trace를 아티팩트로 남깁니다.

### 설계상 선택

- **규칙 기반이 기본**: 같은 데이터면 언제나 같은 결과가 나오고 설명 가능해야 하므로, 판단(탐지·요인·제안)은 규칙으로 하고 LLM은 "질문에 자연어로 답하기"에만 씁니다.
- **추정치는 숨긴다**: 업로드 파일에 없는 컬럼은 계산 편의상 추정으로 채우지만, 그 값에 기대는 지표·인사이트·표 열·질의 답변은 내보내지 않습니다.
- **비교는 같은 길이일 때만**: 이전 구간이 모자라면 증감 대신 "비교 없음" — 가짜 +100%를 만들지 않습니다.
- **보안 헤더**: `nosniff`, `Referrer-Policy`, `Permissions-Policy`, 틀(iframe) 허용은 자기 자신과 miraeailab.com으로 제한.

## 데이터 구조 (Supabase)

`supabase/schema.sql`에 users / datasets / dataset_rows / analyses / insights / anomalies / forecasts / reports / ai_queries
스키마가 정의되어 있습니다. 데모 모드에서는 브라우저 localStorage로 동작합니다.

## 디렉터리

```
app/(app)/      dashboard, anomalies, insights, analytics, forecast, reports, data, ai, settings, more
app/intro/      서비스 소개
components/     PageHeader, Panel, FilterToolbar, ScopeSheet, DatasetSwitcher, Select, KpiStrip, AnomalyList, InsightList,
                Sidebar, TopBar, MobileNav, DateLine, DateRangePicker, DataTable, UploadPanel,
                AnalysisOverlay, ToastStack, EmptyState, PageSkeleton, AppFooter,
                SampleBridgeCTA, MiraeLogo, Logo, charts/
lib/            analytics-engine, anomaly-engine, forecast-engine, insight-generator, report, dataset-meta,  ← 순수 계산
                csv, demo-data, format, persist, store, drill, nav, ui, use-popover, palette, brand, notifications,
                ai/ (contract · context · client)
app/api/ai/     LLM 프록시 라우트
tests/          unit/ (Vitest) · e2e/ (Playwright + axe)
public/         brand/ 로고 · sample/insightai-sample.csv 업로드 예시
supabase/       schema.sql
```
