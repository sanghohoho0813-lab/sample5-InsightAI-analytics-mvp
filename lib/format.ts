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

function formatPercent(value: number, digits = 2): string {
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

/** "2026-10-02" → "10월 2일" */
export function formatMonthDay(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}월 ${Number(d)}일`;
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

/* ───────── 조사 — 받침에 따라 이/가, 은/는, 을/를, 와/과, 으로/로를 고른다 ───────── */

// 숫자를 읽었을 때의 받침: 영·일·삼·육·칠·팔은 받침이 있고(일·칠·팔은 ㄹ), 이·사·오·구는 없다.
const DIGIT_BATCHIM: Record<string, "none" | "rieul" | "other"> = {
  "0": "other", "1": "rieul", "2": "none", "3": "other", "4": "none",
  "5": "none", "6": "other", "7": "rieul", "8": "rieul", "9": "none",
};

function batchim(word: string): "none" | "rieul" | "other" {
  const w = word.replace(/[\s'"’)\]]+$/, "");
  const ch = w.charAt(w.length - 1);
  if (!ch || ch === "%") return "none"; // 퍼센트
  if (ch in DIGIT_BATCHIM) return DIGIT_BATCHIM[ch];
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "none";
  const jong = (code - 0xac00) % 28;
  return jong === 0 ? "none" : jong === 8 ? "rieul" : "other";
}

type Josa = "이" | "은" | "을" | "과" | "으로";
const PAIRS: Record<Josa, [string, string]> = {
  이: ["이", "가"],
  은: ["은", "는"],
  을: ["을", "를"],
  과: ["과", "와"],
  으로: ["으로", "로"],
};

/** josa("₩7.3억", "으로") → "₩7.3억으로", josa("이메일", "이") → "이메일이" */
export function josa(word: string, kind: Josa): string {
  const b = batchim(word);
  const [withB, withoutB] = PAIRS[kind];
  // '으로'는 ㄹ 받침 뒤에서 '로'가 된다(예: 서울로).
  if (kind === "으로") return word + (b === "other" ? withB : withoutB);
  return word + (b === "none" ? withoutB : withB);
}
