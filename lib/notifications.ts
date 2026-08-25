import { detectAnomalies } from "./anomaly-engine";
import { DemoDataset, Filters, NotificationItem } from "./types";

/** 알림은 사용자가 고른 필터와 무관하게 최근 30일 기준으로 고정 산출한다. */
const NOTIFICATION_SCOPE: Filters = {
  preset: "30",
  rangeDays: 30,
  channel: "all",
  product: "all",
};

export function buildNotifications(
  dataset: DemoDataset | null,
  readIds: string[]
): NotificationItem[] {
  if (!dataset) return [];
  const read = new Set(readIds);
  return detectAnomalies(dataset.rows, NOTIFICATION_SCOPE)
    .filter((a) => a.severity !== "info")
    .slice(0, 8)
    .map((a) => ({
      id: a.id,
      severity: a.severity,
      title: a.title,
      description: a.description,
      date: a.date,
      metric: a.metric,
      read: read.has(a.id),
    }));
}

export function unreadCount(items: NotificationItem[]): number {
  return items.filter((n) => !n.read).length;
}
