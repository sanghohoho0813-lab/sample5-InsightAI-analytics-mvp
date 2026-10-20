/** 분석 대상 데이터의 기본 행 단위. 날짜 × 채널 × 상품 단위의 집계 값이다. */
export interface DataRow {
  date: string; // YYYY-MM-DD
  channel: string;
  product: string;
  revenue: number;
  orders: number;
  visitors: number;
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  conversionRate: number; // %
  aov: number; // 평균 주문금액(₩)
  adSpend: number;
}

export interface DemoDataset {
  id: string;
  name: string;
  description: string;
  category: string;
  rows: DataRow[];
  channels: string[];
  products: string[];
  periodLabel: string;
  /** 업로드 파일에 없어 다른 값으로 추정한 필드 — 추정치로 만든 지표는 화면에 내지 않는다 */
  derived?: DerivedField[];
}

export type DerivedField = "orders" | "visitors" | "customers" | "returningCustomers" | "adSpend" | "channel" | "product";

export interface KpiResult {
  key: string;
  label: string;
  value: number;
  prevValue: number;
  changePct: number; // 전기간 대비 %
  format: "currency" | "number" | "percent" | "currencyExact";
  spark: number[]; // 일별 미니 스파크라인
  invert?: boolean; // true면 감소가 긍정
  /** 같은 길이의 이전 기간 데이터가 있어 증감을 계산할 수 있는지 */
  comparable: boolean;
}

export interface DailyPoint {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
  visitors: number;
  conversionRate: number;
  aov: number;
  adSpend: number;
  prevRevenue?: number; // 이전 기간 동일 인덱스 값
  [key: string]: string | number | undefined;
}

export interface ChannelShare {
  channel: string;
  revenue: number;
  share: number; // %
  changePct: number;
}

export type Severity = "critical" | "warning" | "info";

/** 이상치가 잡힌 지표 하나의 근거 — 가장 크게 벗어난 날의 값과 평소 수준 */
export interface AnomalyMetric {
  key: string;
  label: string;
  /** 이 지표가 가장 크게 벗어난 날 */
  date: string;
  value: number;
  /** 평소 수준(최근 7일 중앙값) */
  expected: number;
  deltaPct: number;
}

export interface Anomaly {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  metric: string;
  /** 변화가 시작된 날 */
  date: string;
  /** 변화가 마지막으로 감지된 날(하루짜리면 date와 같다) */
  endDate: string;
  /** 이어진 일수 */
  days: number;
  /** 데이터 마지막 날까지 이어지고 있는지 */
  ongoing: boolean;
  direction: "up" | "down";
  deltaPct: number;
  detail: string;
  /** 원인 채널(전체 합계에서 감지되면 없음) */
  channel?: string;
  /** 분석 화면에서 열 지표 */
  metricKey: MetricKey;
  metrics: AnomalyMetric[];
}

/** 분석 화면의 범위·지표로 들어가는 드릴다운 대상 */
export interface DrillTarget {
  channel?: string;
  product?: string;
  metric?: MetricKey;
}

export interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  /** 결론을 확인할 수 있는 계산값 — "웹사이트 ₩3.1억 → ₩4.3억 (+39%)" */
  evidence: string[];
  /** 계산 방식 — 추정이 섞였으면 그렇다고 밝힌다 */
  basis: string;
  impact: "positive" | "negative" | "neutral";
  /** "관련 데이터 보기" 드릴다운 대상 — 분석 화면의 필터·지표로 연결된다. */
  drill?: DrillTarget;
}

/** 분석 화면에서 선택 가능한 핵심 지표 */
export type MetricKey = "revenue" | "orders" | "customers" | "conversion" | "aov";

/** 실행 제안·브리핑 항목에서 이어지는 화면 */
export type ActionLink =
  | { kind: "anomaly"; id: string }
  | ({ kind: "segment" } & DrillTarget);

export interface Recommendation {
  id: string;
  /** 해야 할 일 — 동사로 끝나는 구체적인 행동 */
  title: string;
  /** 어떻게 확인·실행하는지 */
  description: string;
  /** 왜 — 이 제안을 만든 계산값 */
  evidence: string;
  priority: "high" | "medium" | "low";
  link?: ActionLink;
}

export interface ForecastPoint {
  date: string;
  value: number | null; // 실측
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface ForecastBacktest {
  /** 가린 7일 — 실제 값과 그때 했을 예측 */
  days: { date: string; actual: number; forecast: number; lower: number; upper: number }[];
  /** 7일 합계 오차율(%) */
  totalErrorPct: number;
  /** 하루 평균 오차율(%) */
  dailyErrorPct: number;
  /** 실제 값이 예상 범위 안에 든 날 수 */
  withinRange: number;
}

export interface ForecastSummary {
  key: "revenue" | "orders" | "customers";
  label: string;
  next7Total: number;
  changePct: number;
  format: "currency" | "number";
  points: ForecastPoint[];
  /** 예측의 근거 — 최근 7일 하루 평균, 하루 추세(%) */
  basis?: { recentAvg: number; dailyGrowthPct: number };
  /** 지난 7일로 해 본 검증 — 데이터가 21일보다 짧으면 null */
  backtest?: ForecastBacktest | null;
}

export interface AnalysisRecord {
  id: string;
  name: string;
  datasetName: string;
  createdAt: string;
  /** 분석 시점에 실제로 계산된 가장 중요한 발견 */
  keyInsight: string;
  /** 분석 시점 매출 변화율(%) · 감지된 주의 이상치 수 */
  revenueChangePct?: number;
  alertCount?: number;
  status: "completed";
  datasetId: string;
  source: "demo" | "upload";
  /** 업로드 원본을 브라우저에 보관해 다시 열 수 있는지 여부 */
  restorable: boolean;
}

/** 보고서에 남기는 브리핑 항목 한 줄 */
export interface BriefSnapshot {
  title: string;
  body: string;
  evidence?: string[];
  basis?: string;
  tone: "positive" | "negative" | "neutral";
}

/**
 * 저장된 보고서 — 특정 시점의 분석 결론을 남긴 업무 기록.
 * 저장 시점의 계산 결과를 스냅샷으로 보관해, 데이터가 바뀌어도 그때의 결론을 그대로 다시 연다.
 * (v2 이전에 저장된 보고서는 brief·comparison·data가 없을 수 있다)
 */
export interface SavedReport {
  id: string;
  title: string;
  createdAt: string;
  datasetId: string;
  datasetName: string;
  /** 동일 조건 중복 저장 판단용 (데이터셋·기간·채널·상품) */
  signature: string;
  scope: { start: string; end: string; days: number; channel: string; product: string };
  /** "최근 30일 · 이전 30일과 비교" */
  comparison?: string;
  headline: string;
  brief?: { change?: BriefSnapshot; cause?: BriefSnapshot; risk?: BriefSnapshot };
  /** 분석에 쓴 데이터 — 출처·행 수·마지막 날짜·추정으로 채운 컬럼 */
  data?: { source: "demo" | "upload"; rows: number; days: number; lastDate: string; estimated: string[] };
  kpis: { key: string; label: string; value: number; prevValue: number; changePct: number; format: KpiResult["format"]; comparable?: boolean }[];
  findings: { title: string; description: string; impact: Insight["impact"]; evidence?: string[]; basis?: string }[];
  anomalies: { title: string; description: string; severity: Severity; date: string; days?: number; ongoing?: boolean }[];
  forecasts: { label: string; next7Total: number; changePct: number; format: "currency" | "number" }[];
  recommendations: {
    title: string;
    description: string;
    evidence?: string;
    /** v1 보고서의 예상 효과(추정) */
    expectedEffect?: string;
    priority: Recommendation["priority"];
  }[];
}

export interface AppSettings {
  defaultPreset: "7" | "30" | "90";
}

export type RangePreset = "7" | "30" | "90" | "custom";

export interface Filters {
  preset: RangePreset;
  rangeDays: number; // 프리셋 기간(일). custom일 때는 선택 구간 길이
  range?: { start: string; end: string }; // preset === "custom"일 때만 사용
  channel: string; // "all" | channel명
  product: string; // "all" | product명
}

