import { dailySeries, uniqueDates } from "./analytics-engine";
import { DataRow, ForecastPoint, ForecastSummary } from "./types";

/**
 * 데모 예측 로직: 최근 14일 이동평균 + 최근 성장률 기반 외삽.
 * 실제 ML 모델이 아닌 규칙 기반 추정이며, UI에서는 "단순 추세 모델 · 추정치"로 표기한다.
 */
function forecastMetric(values: number[], dates: string[], horizon = 7) {
  // 최근 7일 수준을 기준으로, 직전 7일 대비 성장률을 일 단위로 완만하게 반영
  const recent = values.slice(-7);
  const prev = values.slice(-14, -7);
  const window14 = values.slice(-14);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length);
  const prevAvg = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : recentAvg;
  const growth = prevAvg > 0 ? (recentAvg - prevAvg) / prevAvg : 0;
  const dailyGrowth = Math.max(-0.025, Math.min(0.025, growth / 7));
  const mean14 = window14.reduce((a, b) => a + b, 0) / Math.max(1, window14.length);
  const sd = Math.sqrt(
    window14.reduce((a, b) => a + (b - mean14) ** 2, 0) / Math.max(1, window14.length)
  );

  const last = new Date(dates[dates.length - 1] + "T00:00:00Z");
  const points: { date: string; forecast: number; lower: number; upper: number }[] = [];
  let level = recentAvg;
  for (let i = 1; i <= horizon; i++) {
    level *= 1 + dailyGrowth;
    const d = new Date(last);
    d.setUTCDate(last.getUTCDate() + i);
    const widen = 1 + i * 0.12; // 먼 미래일수록 예측 범위 확대
    points.push({
      date: d.toISOString().slice(0, 10),
      forecast: Math.round(level),
      lower: Math.max(0, Math.round(level - sd * widen)),
      upper: Math.round(level + sd * widen),
    });
  }
  return { points, recentAvg, sd };
}

/** 예측에는 최근 7일과 직전 7일 비교가 필요하다. 이보다 짧으면 예측하지 않는다. */
export const FORECAST_MIN_DAYS = 14;

export function computeForecasts(rows: DataRow[], horizon = 7): ForecastSummary[] {
  const dates = uniqueDates(rows);
  if (dates.length < FORECAST_MIN_DAYS) return [];
  const series = dailySeries(rows, dates);
  const historyDays = 21;

  const defs: { key: "revenue" | "orders" | "customers"; label: string; format: "currency" | "number" }[] = [
    { key: "revenue", label: "매출 예측", format: "currency" },
    { key: "orders", label: "주문 수 예측", format: "number" },
    { key: "customers", label: "고객 수 예측", format: "number" },
  ];

  return defs.map((def) => {
    const values = series.map((p) => p[def.key] as number);
    const { points } = forecastMetric(values, dates, horizon);
    const next7Total = points.reduce((a, p) => a + p.forecast, 0);
    const last7Total = values.slice(-7).reduce((a, b) => a + b, 0);
    const changePct = last7Total > 0 ? +(((next7Total - last7Total) / last7Total) * 100).toFixed(1) : 0;

    const history: ForecastPoint[] = series.slice(-historyDays).map((p) => ({
      date: p.date,
      value: p[def.key] as number,
      forecast: null,
      lower: null,
      upper: null,
    }));
    // 실측 마지막 점과 예측 첫 점을 이어주기 위한 브리지
    const bridge = history[history.length - 1];
    if (bridge) {
      bridge.forecast = bridge.value;
      bridge.lower = bridge.value;
      bridge.upper = bridge.value;
    }
    const future: ForecastPoint[] = points.map((p) => ({
      date: p.date,
      value: null,
      forecast: p.forecast,
      lower: p.lower,
      upper: p.upper,
    }));

    return {
      key: def.key,
      label: def.label,
      next7Total,
      changePct,
      format: def.format,
      points: [...history, ...future],
    };
  });
}
