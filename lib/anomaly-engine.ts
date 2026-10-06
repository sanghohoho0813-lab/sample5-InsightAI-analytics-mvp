import { dailySeries, filterDimensions, resolveDates, uniqueDates } from "./analytics-engine";
import { formatDateKR, formatKRW, formatNumber } from "./format";
import { Anomaly, DataRow, Filters, MetricKey, Severity } from "./types";

type MetricId = "revenue" | "visitors" | "orders" | "conversionRate" | "aov";

interface MetricDef {
  key: MetricId;
  label: string;
}

const METRICS: MetricDef[] = [
  { key: "revenue", label: "매출" },
  { key: "visitors", label: "트래픽" },
  { key: "orders", label: "주문 수" },
  { key: "conversionRate", label: "전환율" },
  { key: "aov", label: "평균 주문금액" },
];

/** 이상치 지표 → 분석 화면 지표 (트래픽은 별도 KPI가 없어 매출 추이로 연결) */
const DRILL_METRIC: Record<MetricId, MetricKey> = {
  revenue: "revenue",
  visitors: "revenue",
  orders: "orders",
  conversionRate: "conversion",
  aov: "aov",
};

/** 이상치를 찾으려면 기준이 되는 7일 + 비교할 하루가 필요하다(기간 앞의 데이터도 기준으로 쓴다). */
export const ANOMALY_MIN_DAYS = 8;

function fmtMetric(key: MetricId, v: number): string {
  if (key === "conversionRate") return `${v.toFixed(2)}%`;
  if (key === "revenue" || key === "aov") return formatKRW(v);
  return formatNumber(v);
}

/** 받침 유무에 따른 주격 조사(이/가) 선택 */
function subject(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return `${word}이(가)`;
  return word + ((code - 0xac00) % 28 ? "이" : "가");
}

/** 지표가 모두 '많을수록 좋은' 값이므로 하락은 위험·주의, 상승(좋은 소식)은 참고로 둔다. */
function severityFor(deltaPct: number): Severity {
  if (deltaPct < 0) return Math.abs(deltaPct) >= 40 ? "critical" : "warning";
  return "info";
}

interface Hit {
  scope: string;
  metric: MetricDef;
  date: string;
  delta: number;
  basis: string;
  mean: number;
  value: number;
}

/**
 * 이상치 탐지 (규칙 기반):
 * 1) 전일 대비 ±30% 이상 변화
 * 2) 최근 7일 평균 대비 ±2 표준편차 이탈(변화폭 15% 이상)
 * 채널 단위까지 검사해 원인 채널을 표시하고, 소음을 줄이기 위해
 * - 급감 다음 날의 반등, 급증 다음 날의 하락(제자리로 돌아온 것)은 따로 알리지 않고
 * - 같은 날·같은 범위·같은 방향의 여러 지표 변화는 한 건으로 묶는다.
 */
export function detectAnomalies(
  rows: DataRow[],
  filters: Filters,
  opts: { exclude?: MetricId[] } = {}
): Anomaly[] {
  const metrics = METRICS.filter((m) => !opts.exclude?.includes(m.key));
  // 상품 필터는 반영하고, 채널은 원인 채널을 찾기 위해 전 채널을 스캔한다.
  const scoped = filterDimensions(rows, { ...filters, channel: "all" });
  const { currentDates } = resolveDates(rows, filters);
  if (!currentDates.length) return [];
  const windowSet = new Set(currentDates);
  // 기간 첫날도 판단할 수 있도록, 기간 앞의 7일을 기준선으로 함께 불러온다.
  const end = currentDates[currentDates.length - 1];
  const dates = uniqueDates(scoped).filter((d) => d <= end);
  if (dates.length < ANOMALY_MIN_DAYS) return [];
  const channels =
    filters.channel === "all" ? Array.from(new Set(scoped.map((r) => r.channel))) : [filters.channel];
  const hits: Hit[] = [];

  const scan = (scope: string, series: ReturnType<typeof dailySeries>) => {
    for (const m of metrics) {
      let lastDropAt = -10;
      let lastSurgeAt = -10;
      for (let i = 7; i < series.length; i++) {
        const today = series[i][m.key] as number;
        const yesterday = series[i - 1][m.key] as number;
        const window = series.slice(i - 7, i).map((p) => p[m.key] as number);
        const mean = window.reduce((a, b) => a + b, 0) / window.length;
        const sd = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);

        const dayDelta = yesterday > 0 ? ((today - yesterday) / yesterday) * 100 : 0;
        const meanDelta = mean > 0 ? ((today - mean) / mean) * 100 : 0;
        const zScore = sd > 0 ? (today - mean) / sd : 0;

        const bigDayMove = Math.abs(dayDelta) >= 30;
        const bigDeviation = Math.abs(zScore) >= 2 && Math.abs(meanDelta) >= 15;
        if (!bigDayMove && !bigDeviation) continue;

        const delta = bigDayMove ? dayDelta : meanDelta;
        const inWindow = windowSet.has(series[i].date);
        // 급감 직후의 반등, 급증 직후의 하락은 평소 수준으로 돌아온 것이므로 알리지 않는다.
        const settling = Math.abs(meanDelta) < 30;
        if (delta > 0 && i - lastDropAt <= 2 && settling) continue;
        if (delta < 0 && i - lastSurgeAt <= 2 && settling) continue;
        if (delta < 0) lastDropAt = i;
        else lastSurgeAt = i;
        if (!inWindow) continue;

        hits.push({
          scope,
          metric: m,
          date: series[i].date,
          delta,
          basis: bigDayMove ? "전일 대비" : "최근 7일 평균 대비",
          mean,
          value: today,
        });
      }
    }
  };

  const dateSet = new Set(dates);
  const windowRows = scoped.filter((r) => dateSet.has(r.date));

  if (filters.channel === "all") scan("전체", dailySeries(windowRows, dates));
  if (channels.length > 1 || filters.channel !== "all") {
    for (const ch of channels) scan(ch, dailySeries(windowRows.filter((r) => r.channel === ch), dates));
  }

  // 같은 날·지표·방향은 채널 단위(원인)가 있으면 그쪽을 남기고 전체 합계는 뺀다.
  const byKey = new Map<string, Hit>();
  const rank = (h: Hit) => (h.scope === "전체" ? 0 : 1) * 1000 + Math.abs(h.delta);
  for (const h of hits) {
    const k = `${h.metric.key}-${h.date}-${h.delta > 0 ? "up" : "down"}`;
    const prev = byKey.get(k);
    if (!prev || rank(h) > rank(prev)) byKey.set(k, h);
  }

  // 같은 날·범위·방향의 지표들을 한 건으로 묶는다.
  const groups = new Map<string, Hit[]>();
  for (const h of byKey.values()) {
    const k = `${h.scope}|${h.date}|${h.delta > 0 ? "up" : "down"}`;
    groups.set(k, [...(groups.get(k) ?? []), h]);
  }

  const anomalies: Anomaly[] = Array.from(groups.entries()).map(([key, list]) => {
    const order = metrics.map((m) => m.key);
    list.sort((a, b) => order.indexOf(a.metric.key) - order.indexOf(b.metric.key));
    // 제목·수치는 가장 중요한 지표(매출 → 트래픽 → 주문 순) 기준으로 맞춘다.
    const primary = list[0];
    const { scope, date } = primary;
    const isDrop = primary.delta < 0;
    const where = scope !== "전체" ? `${scope} ` : "";
    const labels = list.map((h) => h.metric.label);
    const parts = list.map((h) => `${h.metric.label} ${h.delta > 0 ? "+" : ""}${h.delta.toFixed(0)}%`);
    return {
      id: key.replace(/\|/g, "-"),
      severity: list.map((h) => severityFor(h.delta)).sort((a, b) => SEV.indexOf(a) - SEV.indexOf(b))[0],
      title: `${where}${labels.length <= 2 ? labels.join("·") : `${labels[0]} 등 ${labels.length}개 지표`} ${isDrop ? "급감" : "급증"}`,
      description:
        list.length === 1
          ? `${scope !== "전체" ? `${scope} 채널의 ` : ""}${subject(primary.metric.label)} ${primary.basis} ${Math.abs(primary.delta).toFixed(0)}% ${isDrop ? "감소" : "상승"}했습니다.`
          : `${scope !== "전체" ? `${scope} 채널에서 ` : ""}${parts.join(", ")} (${primary.basis})`,
      metric: primary.metric.label,
      date,
      deltaPct: +primary.delta.toFixed(1),
      channel: scope !== "전체" ? scope : undefined,
      metricKey: DRILL_METRIC[primary.metric.key],
      detail: `${formatDateKR(date)} ${primary.metric.label} ${fmtMetric(primary.metric.key, primary.value)} · 직전 7일 평균 ${fmtMetric(primary.metric.key, primary.mean)}`,
    };
  });

  // 심각도 → 최신순
  return anomalies
    .sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity) || b.date.localeCompare(a.date))
    .slice(0, 12);
}

const SEV: Severity[] = ["critical", "warning", "info"];
