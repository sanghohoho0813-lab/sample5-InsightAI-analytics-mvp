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
}

export interface KpiResult {
  key: string;
  label: string;
  value: number;
  prevValue: number;
  changePct: number; // 전기간 대비 %
  format: "currency" | "number" | "percent" | "currencyExact";
  spark: number[]; // 일별 미니 스파크라인
  invert?: boolean; // true면 감소가 긍정
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
}

export interface Insight {
  id: string;
  category: string;
  title: string;
  description: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
}

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
  keyInsight: string;
  status: "completed";
  datasetId: string;
}

export interface Filters {
  rangeDays: 7 | 30 | 90;
  channel: string; // "all" | channel명
  product: string; // "all" | product명
}
