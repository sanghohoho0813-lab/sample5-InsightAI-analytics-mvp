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

export interface Anomaly {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  metric: string;
  date: string;
  deltaPct: number;
  detail: string;
  /** 원인 채널(전체 합계에서 감지되면 없음) */
  channel?: string;
  /** 분석 화면에서 열 지표 */
  metricKey: MetricKey;
}

export interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
  /** "관련 데이터 보기" 드릴다운 대상 — 분석 화면의 필터·지표로 연결된다. */
  drill?: { channel?: string; product?: string; metric?: MetricKey };
}

/** 분석 화면에서 선택 가능한 핵심 지표 */
export type MetricKey = "revenue" | "orders" | "customers" | "conversion" | "aov";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  expectedEffect: string;
  priority: "high" | "medium" | "low";
}

export interface ForecastPoint {
  date: string;
  value: number | null; // 실측
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface ForecastSummary {
  key: "revenue" | "orders" | "customers";
  label: string;
  next7Total: number;
  changePct: number;
  format: "currency" | "number";
  points: ForecastPoint[];
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

/** 저장된 보고서 — 저장 시점의 계산 결과를 스냅샷으로 보관해 나중에 그대로 다시 연다. */
export interface SavedReport {
  id: string;
  title: string;
  createdAt: string;
  datasetId: string;
  datasetName: string;
  /** 동일 조건 중복 저장 판단용 (데이터셋·기간·채널·상품) */
  signature: string;
  scope: { start: string; end: string; days: number; channel: string; product: string };
  headline: string;
  kpis: { key: string; label: string; value: number; prevValue: number; changePct: number; format: KpiResult["format"]; comparable?: boolean }[];
  findings: { title: string; description: string; impact: Insight["impact"] }[];
  anomalies: { title: string; description: string; severity: Severity; date: string }[];
  forecasts: { label: string; next7Total: number; changePct: number; format: "currency" | "number" }[];
  recommendations: { title: string; description: string; expectedEffect: string; priority: Recommendation["priority"] }[];
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

