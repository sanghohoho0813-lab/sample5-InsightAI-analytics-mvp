import { dailySeries, filterDimensions, resolveDates, uniqueDates } from "./analytics-engine";
import { formatDateKR, formatKRW, formatKRWExact, formatNumber, josa } from "./format";
import { Anomaly, AnomalyMetric, DailyPoint, DataRow, Filters, MetricKey, Severity } from "./types";

export type MetricId = "revenue" | "visitors" | "orders" | "conversionRate" | "aov";

interface MetricDef {
  key: MetricId;
  label: string;
  /** 평소 대비 이 비율(%) 이상 벗어나야 이상치로 본다 — 비율 지표는 잡음이 작아 기준을 낮춘다 */
  threshold: number;
}

export const ANOMALY_METRICS: MetricDef[] = [
  { key: "revenue", label: "매출", threshold: 20 },
  { key: "visitors", label: "방문자", threshold: 25 },
  { key: "orders", label: "주문 수", threshold: 20 },
  { key: "conversionRate", label: "전환율", threshold: 15 },
  { key: "aov", label: "객단가", threshold: 15 },
];

/** 이상치 지표 → 분석 화면 지표 (방문자는 별도 KPI가 없어 매출 추이로 연결) */
const DRILL_METRIC: Record<MetricId, MetricKey> = {
  revenue: "revenue",
  visitors: "revenue",
  orders: "orders",
  conversionRate: "conversion",
  aov: "aov",
};

/** 이상치를 찾으려면 기준이 되는 7일 + 비교할 하루가 필요하다(기간 앞의 데이터도 기준으로 쓴다). */
export const ANOMALY_MIN_DAYS = 8;
/** 같은 요일 기준선은 같은 요일 값이 2번 이상(15일 이상) 있어야 만든다. */
export const WEEKLY_MIN_DAYS = 15;

export function fmtMetric(key: string, v: number): string {
  if (key === "conversionRate") return `${v.toFixed(2)}%`;
  if (key === "aov") return formatKRWExact(v);
  if (key === "revenue") return formatKRW(v);
  return formatNumber(v);
}

/** 받침 유무에 따른 주격 조사(이/가) 선택 */
export const subject = (word: string) => josa(word, "이");

/**
 * 지금 확인할 우선순위 — 아직 이어지는 것 > 위험 등급 > 최근에 끝난 것.
 * 브리핑의 '지금 확인할 위험'과 실행 제안이 같은 순서를 쓴다.
 */
export function urgency(a: Anomaly, end: string): number {
  const ago = (Date.parse(end) - Date.parse(a.endDate)) / 86_400_000;
  return (a.severity === "critical" ? 50 : a.severity === "warning" ? 30 : 0) + (a.ongoing ? 60 : 0) + (ago <= 7 ? 15 : ago <= 14 ? 5 : 0);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface Baseline {
  /** 최근 7일 중앙값 — 하루짜리 튀는 값에 흔들리지 않는 '요즘 평소 수준' */
  level: number;
  /** 최근 4주 같은 요일 중앙값 — 주말 효과 같은 요일 패턴. 데이터가 짧으면 null */
  weekly: number | null;
}

/** i번째 날의 평소 수준. i < 7이면 계산하지 않는다. */
export function baselineAt(series: DailyPoint[], i: number, key: MetricId): Baseline | null {
  if (i < 7) return null;
  const val = (j: number) => series[j][key] as number;
  const recent = Array.from({ length: 7 }, (_, k) => val(i - 7 + k));
  const same = [7, 14, 21, 28].filter((k) => i - k >= 0).map((k) => val(i - k));
  return { level: median(recent), weekly: same.length >= 2 ? median(same) : null };
}

const pct = (v: number, base: number) => (base > 0 ? ((v - base) / base) * 100 : 0);

/**
 * 평소와 다른 날인지 — 최근 7일 수준과 같은 요일 수준 '둘 다'에서 같은 방향으로 크게 벗어나야 한다.
 * - 주말마다 내려가는 매장 매출(요일 패턴)은 같은 요일 기준으로는 평소라 알리지 않는다.
 * - 프로모션이 끝나 평소로 돌아온 날도 같은 요일 기준으로는 평소라 알리지 않는다.
 */
export function deviation(value: number, base: Baseline, threshold: number): number | null {
  if (base.level <= 0) return null;
  const vsLevel = pct(value, base.level);
  // 상승은 '참고' 소식이라 잡음에 덜 반응하도록 기준을 25% 높인다.
  const t = vsLevel > 0 ? threshold * 1.25 : threshold;
  if (Math.abs(vsLevel) < t) return null;
  if (base.weekly != null) {
    const vsWeek = pct(value, base.weekly);
    if (Math.abs(vsWeek) < t || Math.sign(vsWeek) !== Math.sign(vsLevel)) return null;
  }
  return vsLevel;
}

/** 지표가 모두 '많을수록 좋은' 값이므로 하락은 위험·주의, 상승(좋은 소식)은 참고로 둔다. */
function severityFor(deltaPct: number): Severity {
  if (deltaPct < 0) return Math.abs(deltaPct) >= 40 ? "critical" : "warning";
  return "info";
}

interface Hit {
  scope: string;
  metric: MetricDef;
  index: number;
  date: string;
  delta: number;
  value: number;
  expected: number;
}

interface Episode {
  scope: string;
  up: boolean;
  start: number;
  end: number;
  hits: Hit[];
}

/** 이상치 범위의 일별 시리즈 — 조사 화면도 같은 계산을 쓴다. */
export function scopeSeries(rows: DataRow[], product: string, scope: string, end?: string): DailyPoint[] {
  const scoped = filterDimensions(rows, { preset: "30", rangeDays: 30, channel: "all", product });
  const dates = uniqueDates(scoped).filter((d) => !end || d <= end);
  const set = new Set(dates);
  return dailySeries(
    scoped.filter((r) => set.has(r.date) && (scope === "전체" || r.channel === scope)),
    dates
  );
}

/**
 * 이상치 탐지 (규칙 기반):
 * - 지표별로 '평소 수준'(최근 7일 중앙값, 같은 요일 중앙값)에서 20% 이상(전환율·객단가는 15%) 벗어난 날을 찾는다.
 * - 채널 단위까지 검사해 원인 채널을 표시한다. 같은 날·지표·방향이면 채널 쪽을 남긴다.
 * - 같은 범위·방향으로 며칠 이어진 변화는 한 건(시작일·지속 일수)으로 묶는다.
 * - 방문자가 급감한 날 전환율이 '급증'하는 것처럼, 분모가 줄어 생긴 비율 변화는 따로 알리지 않는다.
 */
export function detectAnomalies(
  rows: DataRow[],
  filters: Filters,
  opts: { exclude?: MetricId[] } = {}
): Anomaly[] {
  const metrics = ANOMALY_METRICS.filter((m) => !opts.exclude?.includes(m.key));
  // 상품 필터는 반영하고, 채널은 원인 채널을 찾기 위해 전 채널을 스캔한다.
  const scoped = filterDimensions(rows, { ...filters, channel: "all" });
  const { currentDates } = resolveDates(rows, filters);
  if (!currentDates.length) return [];
  const windowSet = new Set(currentDates);
  // 기간 첫날도 판단할 수 있도록 기간 앞의 데이터를 기준선으로 함께 쓴다.
  const end = currentDates[currentDates.length - 1];
  const dates = uniqueDates(scoped).filter((d) => d <= end);
  if (dates.length < ANOMALY_MIN_DAYS) return [];
  const lastDataDate = uniqueDates(scoped).at(-1);
  const channels =
    filters.channel === "all" ? Array.from(new Set(scoped.map((r) => r.channel))) : [filters.channel];
  const hits: Hit[] = [];

  const scan = (scope: string) => {
    const series = scopeSeries(rows, filters.product, scope, end);
    for (const m of metrics) {
      for (let i = 7; i < series.length; i++) {
        if (!windowSet.has(series[i].date)) continue;
        const base = baselineAt(series, i, m.key);
        const value = series[i][m.key] as number;
        const delta = base ? deviation(value, base, m.threshold) : null;
        if (delta == null || !base) continue;
        hits.push({ scope, metric: m, index: i, date: series[i].date, delta, value, expected: base.level });
      }
    }
  };

  if (filters.channel === "all") scan("전체");
  if (channels.length > 1 || filters.channel !== "all") for (const ch of channels) scan(ch);

  // 같은 날·지표·방향에서
  // - 한 채널만 움직였으면 그 채널(원인)을 남기고 전체 합계는 뺀다.
  // - 여러 채널이 함께 움직였고 전체도 움직였으면 사업 전체의 변화(예: 프로모션)로 보고 전체 한 건만 남긴다.
  const byKey = new Map<string, { total?: Hit; channels: Hit[] }>();
  for (const h of hits) {
    const k = `${h.metric.key}-${h.date}-${h.delta > 0 ? "up" : "down"}`;
    const g = byKey.get(k) ?? { channels: [] };
    if (h.scope === "전체") g.total = h;
    else g.channels.push(h);
    byKey.set(k, g);
  }
  const deduped: Hit[] = [];
  for (const g of byKey.values()) {
    if (g.total && (g.channels.length >= 2 || g.channels.length === 0)) deduped.push(g.total);
    else deduped.push(...g.channels);
  }

  // 같은 범위·방향으로 이어진 날들을 한 건으로 묶는다(하루 건너뛴 것까지는 같은 흐름으로 본다).
  const episodes: Episode[] = [];
  const sorted = deduped.sort((a, b) => a.index - b.index);
  for (const h of sorted) {
    const up = h.delta > 0;
    const ep = episodes.find((e) => e.scope === h.scope && e.up === up && h.index - e.end <= 2);
    if (ep) {
      ep.end = Math.max(ep.end, h.index);
      ep.hits.push(h);
    } else episodes.push({ scope: h.scope, up, start: h.index, end: h.index, hits: [h] });
  }

  const overlaps = (a: Episode, b: Episode) => a.start <= b.end && b.start <= a.end;
  // 방문자가 급감한 날 전환율이 '급증'하는 것처럼, 분모가 줄어 생긴 비율 상승은 뺀다.
  // 사업 전체가 같은 방향으로 움직인 기간(예: 프로모션)의 채널별 변화는 전체 한 건에 포함시킨다.
  const ratioOnly = (e: Episode) => e.hits.every((h) => h.metric.key === "conversionRate" || h.metric.key === "aov");
  const kept = episodes.filter(
    (e) =>
      !(e.scope !== "전체" && episodes.some((o) => o.scope === "전체" && o.up === e.up && overlaps(o, e))) &&
      !(
        e.up &&
        ratioOnly(e) &&
        episodes.some(
          (o) =>
            o.scope === e.scope &&
            !o.up &&
            overlaps(o, e) &&
            o.hits.some((h) => h.metric.key === "visitors")
        )
      )
  );

  const order = metrics.map((m) => m.key);
  const anomalies: Anomaly[] = kept.map((e) => {
    // 제목·수치는 가장 중요한 지표(매출 → 방문자 → 주문 순)의 가장 크게 벗어난 날 기준으로 맞춘다.
    const keys = Array.from(new Set(e.hits.map((h) => h.metric.key))).sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const peakOf = (key: MetricId) =>
      e.hits.filter((h) => h.metric.key === key).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
    const peaks = keys.map(peakOf);
    const primary = peaks[0];
    const startDate = e.hits.find((h) => h.index === e.start)!.date;
    const endDate = e.hits.find((h) => h.index === e.end)!.date;
    const days = e.end - e.start + 1;
    const where = `${e.scope} `;
    const labels = peaks.map((h) => h.metric.label);
    const verb = e.up ? "급증" : "급감";
    const severity = peaks.map((h) => severityFor(h.delta)).sort((a, b) => SEV.indexOf(a) - SEV.indexOf(b))[0];
    const ongoing = endDate === lastDataDate && endDate === end;
    const span = days > 1 ? `${formatDateKR(startDate).slice(5)}부터 ${days}일간 ` : "";
    const parts = peaks.map((h) => `${h.metric.label} ${h.delta > 0 ? "+" : "−"}${Math.abs(h.delta).toFixed(0)}%`);
    const detailMetrics: AnomalyMetric[] = peaks.map((h) => ({
      key: h.metric.key,
      label: h.metric.label,
      date: h.date,
      value: h.value,
      expected: h.expected,
      deltaPct: +h.delta.toFixed(1),
    }));
    return {
      id: `${e.scope}-${startDate}-${e.up ? "up" : "down"}`,
      severity,
      title: `${where}${labels.length <= 2 ? labels.join("·") : `${labels[0]} 등 ${labels.length}개 지표`} ${verb}`,
      description:
        peaks.length === 1
          ? `${span}${e.scope !== "전체" ? `${e.scope}의 ` : ""}${subject(primary.metric.label)} 평소보다 ${Math.abs(primary.delta).toFixed(0)}% ${e.up ? "높았습니다" : "낮았습니다"}.`
          : `${span}${e.scope !== "전체" ? `${e.scope}에서 ` : ""}평소 대비 ${parts.join(", ")}`,
      metric: primary.metric.label,
      date: startDate,
      endDate,
      days,
      ongoing,
      direction: e.up ? "up" : "down",
      deltaPct: +primary.delta.toFixed(1),
      channel: e.scope !== "전체" ? e.scope : undefined,
      metricKey: DRILL_METRIC[primary.metric.key],
      metrics: detailMetrics,
      detail: `${formatDateKR(primary.date)} ${primary.metric.label} ${fmtMetric(primary.metric.key, primary.value)} · 평소(최근 7일 중앙값) ${fmtMetric(primary.metric.key, primary.expected)}`,
    };
  });

  // 심각도 → 최신순
  return anomalies
    .sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity) || b.date.localeCompare(a.date))
    .slice(0, 12);
}

const SEV: Severity[] = ["critical", "warning", "info"];
