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
