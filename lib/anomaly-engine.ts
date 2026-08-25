import { dailySeries, uniqueDates } from "./analytics-engine";
import { formatDateKR } from "./format";
import { Anomaly, DataRow, Severity } from "./types";

interface MetricDef {
  key: "revenue" | "visitors" | "orders" | "conversionRate" | "aov";
  label: string;
  goodWhenUp: boolean;
}

const METRICS: MetricDef[] = [
  { key: "revenue", label: "매출", goodWhenUp: true },
  { key: "visitors", label: "트래픽", goodWhenUp: true },
  { key: "orders", label: "주문 수", goodWhenUp: true },
  { key: "conversionRate", label: "전환율", goodWhenUp: true },
  { key: "aov", label: "평균 주문금액", goodWhenUp: true },
];

/** 받침 유무에 따른 주격 조사(이/가) 선택 */
function subject(word: string): string {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return `${word}이(가)`;
  return word + ((code - 0xac00) % 28 ? "이" : "가");
}

function severityFor(deltaPct: number, isNegative: boolean): Severity {
  const a = Math.abs(deltaPct);
  if (isNegative) return a >= 40 ? "critical" : "warning";
  return a >= 45 ? "warning" : "info";
}

/**
 * 이상징후 탐지 (MVP 규칙 기반):
 * 1) 전일 대비 ±30% 이상 변화
 * 2) 최근 7일 평균 대비 ±2 표준편차 이탈
 * 채널 단위 시리즈에 대해 검사해 원인 채널까지 표시한다.
 */
export function detectAnomalies(rows: DataRow[], rangeDays: number): Anomaly[] {
  const dates = uniqueDates(rows).slice(-rangeDays);
  const channels = Array.from(new Set(rows.map((r) => r.channel)));
  const anomalies: Anomaly[] = [];

  const scan = (scope: string, series: ReturnType<typeof dailySeries>) => {
    for (const m of METRICS) {
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
        const isDrop = delta < 0;
        const isNegative = m.goodWhenUp ? isDrop : !isDrop;
        const basis = bigDayMove ? "전일 대비" : "최근 7일 평균 대비";

        anomalies.push({
          id: `${scope}-${m.key}-${series[i].date}`,
          severity: severityFor(delta, isNegative),
          title: `${scope !== "전체" ? scope + " " : ""}${m.label} ${isDrop ? "급감" : "급증"}`,
          description: `${scope !== "전체" ? scope + " 채널의 " : ""}${subject(m.label)} ${basis} ${Math.abs(delta).toFixed(0)}% ${isDrop ? "감소" : "상승"}했습니다.`,
          metric: m.label,
          date: series[i].date,
          deltaPct: +delta.toFixed(1),
          detail: `${formatDateKR(series[i].date)} 기준 ${basis} ${Math.abs(delta).toFixed(1)}% ${isDrop ? "감소" : "상승"}. 7일 평균 ${Math.round(mean).toLocaleString("ko-KR")}, 당일 값 ${Math.round(today).toLocaleString("ko-KR")}.`,
        });
      }
    }
  };

  scan("전체", dailySeries(rows.filter((r) => dates.includes(r.date)), dates));
  for (const ch of channels) {
    scan(ch, dailySeries(rows.filter((r) => r.channel === ch && dates.includes(r.date)), dates));
  }

  // 심각도 → 최신순 정렬 후 중복(같은 날짜·지표) 축약
  const order: Severity[] = ["critical", "warning", "info"];
  const seen = new Set<string>();
  return anomalies
    .sort((a, b) =>
      order.indexOf(a.severity) - order.indexOf(b.severity) || b.date.localeCompare(a.date)
    )
    .filter((a) => {
      const k = `${a.metric}-${a.date}-${a.deltaPct > 0 ? "up" : "down"}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 12);
}
