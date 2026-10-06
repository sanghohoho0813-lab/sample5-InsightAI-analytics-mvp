import { detectAnomalies } from "./anomaly-engine";
import { DemoDataset, DerivedField, Filters, KpiResult } from "./types";

/**
 * 업로드 파일에 없는 컬럼은 다른 값으로 추정해 채우는데(예: 방문자 = 주문×25),
 * 그 추정치로 만든 지표·인사이트는 사실처럼 보이면 안 되므로 여기서 걸러낸다.
 */
const has = (ds: DemoDataset | null | undefined, f: DerivedField) => !ds?.derived?.includes(f);

function kpiAvailable(key: string, ds: DemoDataset | null | undefined): boolean {
  switch (key) {
    case "orders":
    case "aov":
      return has(ds, "orders");
    case "customers":
      return has(ds, "customers");
    case "conversion":
      return has(ds, "orders") && has(ds, "visitors");
    default:
      return true;
  }
}

export function availableKpis(kpis: KpiResult[], ds: DemoDataset | null | undefined): KpiResult[] {
  return kpis.filter((k) => kpiAvailable(k.key, ds));
}

/** 이상치 탐지에서 뺄 지표 (anomaly-engine의 지표 키) */
function anomalyExclusions(ds: DemoDataset | null | undefined) {
  const out: ("visitors" | "orders" | "conversionRate" | "aov")[] = [];
  if (!has(ds, "visitors")) out.push("visitors", "conversionRate");
  if (!has(ds, "orders")) out.push("orders", "aov", "conversionRate");
  return Array.from(new Set(out));
}

/** 채널·상품으로 나눠 볼 수 있는지 (값이 2개 이상일 때만 의미가 있다) */
export function canSplit(ds: DemoDataset | null | undefined, dim: "channel" | "product"): boolean {
  if (!ds) return false;
  return (dim === "channel" ? ds.channels : ds.products).length > 1;
}

/** 데이터셋 단위 공통 계산 입력 — 화면마다 같은 규칙으로 걸러진 결과를 쓰게 한다. */
export function insightContext(ds: DemoDataset, filters: Filters) {
  return { rows: ds.rows, filters, derived: ds.derived ?? [] };
}

export function anomaliesFor(ds: DemoDataset, filters: Filters) {
  return detectAnomalies(ds.rows, filters, { exclude: anomalyExclusions(ds) });
}
