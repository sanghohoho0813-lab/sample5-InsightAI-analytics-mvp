import { detectAnomalies } from "./anomaly-engine";
import { Anomaly, DemoDataset, Filters } from "./types";

/** 확인이 필요한 이상치(주의·위험)는 사용자가 고른 필터와 무관하게 최근 30일 기준으로 센다. */
const ALERT_SCOPE: Filters = { preset: "30", rangeDays: 30, channel: "all", product: "all" };

export function recentAlerts(dataset: DemoDataset | null): Anomaly[] {
  if (!dataset) return [];
  return detectAnomalies(dataset.rows, ALERT_SCOPE).filter((a) => a.severity !== "info");
}

export function unreadAlertCount(dataset: DemoDataset | null, readIds: string[]): number {
  const read = new Set(readIds);
  return recentAlerts(dataset).filter((a) => !read.has(a.id)).length;
}
