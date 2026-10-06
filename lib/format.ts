/** 한국 서비스 관례에 맞춘 숫자/통화 포맷 유틸 */

export function formatKRW(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e8) {
    const eok = value / 1e8;
    return `₩${eok >= 100 ? eok.toFixed(0) : eok.toFixed(1)}억`;
  }
  if (abs >= 1e4) {
    return `₩${Math.round(value / 1e4).toLocaleString("ko-KR")}만`;
  }
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

export function formatKRWExact(value: number): string {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

export function formatPercent(value: number, digits = 2): string {
  return `${value.toFixed(digits)}%`;
}

export function formatChange(pct: number, digits = 1): string {
  const arrow = pct >= 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(pct).toFixed(digits)}%`;
}

export function formatDateShort(date: string): string {
  // "2024-05-16" -> "05.16"
  return date.slice(5).replace("-", ".");
}

export function formatDateKR(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}.${m}.${d}`;
}

export function formatValue(
  value: number,
  format: "currency" | "number" | "percent" | "currencyExact"
): string {
  switch (format) {
    case "currency":
      return formatKRW(value);
    case "currencyExact":
      return formatKRWExact(value);
    case "percent":
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
}

/** 차트 축 눈금용 — 눈금 간격이 좁아도 같은 라벨이 반복되지 않게 소수 한 자리까지 쓴다. */
export function formatAxisKRW(value: number): string {
  const a = Math.abs(value);
  const fmt = (n: number) => {
    const r = Math.round(n * 10) / 10;
    return Math.abs(r) >= 100 || Number.isInteger(r) ? Math.round(r).toLocaleString("ko-KR") : r.toFixed(1);
  };
  if (a >= 1e8) return `${fmt(value / 1e8)}억`;
  if (a >= 1e4) return `${fmt(value / 1e4)}만`;
  return Math.round(value).toLocaleString("ko-KR");
}
