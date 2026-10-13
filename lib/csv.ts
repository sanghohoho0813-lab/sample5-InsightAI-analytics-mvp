import { DataRow, DerivedField } from "./types";

/** 간단한 CSV 파서 (따옴표/쉼표 이스케이프 지원) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

/** 헤더 비교용 정규화 — 대소문자·공백·밑줄·하이픈·BOM 차이를 무시한다 */
const normalizeHeader = (h: string) => h.replace(/\uFEFF/g, "").toLowerCase().replace(/[\s_-]/g, "");

type Field = keyof DataRow;

const HEADER_ALIASES: Record<Field, string[]> = {
  date: ["date", "날짜", "일자", "day", "주문일", "판매일", "거래일"],
  channel: ["channel", "채널", "판매채널", "매장", "지점", "store"],
  product: ["product", "상품", "제품", "item", "상품명", "메뉴"],
  revenue: ["revenue", "매출", "매출액", "sales", "amount", "판매금액", "결제금액"],
  orders: ["orders", "주문", "주문수", "order_count", "주문건수", "건수"],
  visitors: ["visitors", "방문자", "방문자수", "sessions", "traffic", "유입수"],
  customers: ["customers", "고객", "고객수", "구매고객수"],
  newCustomers: ["newcustomers", "new_customers", "신규고객", "신규고객수"],
  returningCustomers: ["returningcustomers", "returning_customers", "재구매고객", "재구매고객수"],
  conversionRate: ["conversionrate", "conversion_rate", "전환율", "cvr"],
  aov: ["aov", "객단가", "평균주문금액"],
  adSpend: ["adspend", "ad_spend", "광고비", "adcost", "광고집행비"],
};

export const FIELD_LABELS: Record<Field, string> = {
  date: "날짜",
  channel: "채널",
  product: "상품",
  revenue: "매출",
  orders: "주문 수",
  visitors: "방문자",
  customers: "고객 수",
  newCustomers: "신규 고객",
  returningCustomers: "재구매 고객",
  conversionRate: "전환율",
  aov: "객단가",
  adSpend: "광고비",
};

const ALIAS_INDEX = new Map<string, Field>();
(Object.keys(HEADER_ALIASES) as Field[]).forEach((f) => HEADER_ALIASES[f].forEach((a) => ALIAS_INDEX.set(normalizeHeader(a), f)));

const fieldOf = (header: string): Field | null => ALIAS_INDEX.get(normalizeHeader(header)) ?? null;

/** 2026.09.01 · 2026/9/1 · 2026년 9월 1일 → 2026-09-01. 없는 날짜(2026-02-30 등)는 null */
export function normalizeDate(v: string): string | null {
  const s = v
    .trim()
    .replace(/\s*(년|월)\s*/g, "-")
    .replace(/\s*일$/, "")
    .replace(/[./]/g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[\sT])/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${m[1]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 숫자 읽기 — ₩·원·쉼표·% 등을 걷어낸다. 숫자가 아니면 null */
function num(v: string | undefined): number | null {
  if (v == null) return null;
  const t = String(v).replace(/[₩,%\s원]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface ColumnMap {
  /** 파일의 헤더 그대로 */
  column: string;
  /** 인식한 항목(없으면 분석에 쓰지 않음) */
  field: Field | null;
  label: string | null;
  /** 같은 항목으로 보이는 열이 이미 있어 쓰지 않았는지 */
  duplicate: boolean;
  /** 값이 비어 있는 행의 비율(0~1) */
  emptyRatio: number;
  /** 첫 번째 값 예시 */
  sample: string;
}

export interface DataIssue {
  level: "error" | "warn" | "info";
  title: string;
  detail: string;
}

export interface ParseResult {
  rows: DataRow[];
  columns: string[];
  rowCount: number;
  error?: string;
  /** 파일에 없어 추정으로 채운 필드 */
  derived?: DerivedField[];
  /** 날짜를 읽지 못해 건너뛴 행 수 */
  skipped?: number;
  /** 열별 인식 결과 */
  mapping?: ColumnMap[];
  /** 데이터 품질 진단 */
  issues?: DataIssue[];
  /** 기간 — 데이터가 있는 날 수, 처음~끝 사이의 빠진 날 수 */
  period?: { start: string; end: string; days: number; missing: number };
}

const lineNo = (i: number, headerRow: number) => i + headerRow + 2; // 엑셀에서 보이는 행 번호(1부터, 헤더 포함)
const examples = (list: { line: number; value: string }[]) =>
  list
    .slice(0, 3)
    .map((x) => `${x.line}행 '${x.value || "(빈 칸)"}'`)
    .join(", ");

/** 헤더 별칭 매핑으로 업로드 데이터를 표준 DataRow로 바꾸고, 품질 문제를 함께 진단한다. */
export function toDataRows(table: string[][]): ParseResult {
  if (table.length < 2) {
    return { rows: [], columns: table[0] ?? [], rowCount: 0, error: "데이터 행이 없습니다. 첫 줄의 헤더와 그 아래 1개 이상의 행이 필요합니다." };
  }

  // 엑셀 내보내기처럼 위에 제목·설명 줄이 있으면, 날짜·매출 헤더가 있는 줄을 찾아 그 줄부터 읽는다.
  const scan = Math.min(10, table.length - 1);
  let headerRow = 0;
  for (let i = 0; i < scan; i++) {
    const fields = table[i].map((h) => fieldOf(String(h)));
    if (fields.includes("date") && fields.includes("revenue")) {
      headerRow = i;
      break;
    }
  }
  const header = table[headerRow].map((h) => String(h).trim());
  const body = table.slice(headerRow + 1);

  // 열 → 항목. 같은 항목으로 보이는 열이 둘이면 앞의 것만 쓴다.
  const idx: Partial<Record<Field, number>> = {};
  const mapping: ColumnMap[] = header.map((column, c) => {
    const field = fieldOf(column);
    const duplicate = field != null && idx[field] != null;
    if (field && !duplicate) idx[field] = c;
    const values = body.map((r) => String(r[c] ?? "").trim());
    const filled = values.filter(Boolean);
    return {
      column: column || `(이름 없는 ${c + 1}번째 열)`,
      field: duplicate ? null : field,
      label: field ? FIELD_LABELS[field] : null,
      duplicate,
      emptyRatio: values.length ? 1 - filled.length / values.length : 1,
      sample: filled[0] ?? "",
    };
  });

  if (idx.date == null || idx.revenue == null) {
    const missing = [idx.date == null ? "날짜" : null, idx.revenue == null ? "매출" : null].filter(Boolean).join("·");
    return {
      rows: [],
      columns: header,
      rowCount: body.length,
      mapping,
      error: `${missing} 열을 찾지 못했습니다. 첫 줄 헤더 이름을 확인해주세요(예: 날짜/Date, 매출/Revenue).`,
    };
  }

  const issues: DataIssue[] = [];
  if (headerRow > 0) {
    issues.push({ level: "info", title: `위쪽 ${headerRow}줄은 제목으로 보고 건너뛰었습니다`, detail: `${headerRow + 1}행을 헤더로 읽었습니다.` });
  }
  for (const m of mapping.filter((x) => x.duplicate)) {
    issues.push({ level: "info", title: `'${m.column}' 열은 쓰지 않았습니다`, detail: `${m.label} 열이 이미 있어 앞쪽 열만 사용했습니다.` });
  }

  // 값이 전부 비어 있는 열은 없는 것으로 본다(0으로 채우면 사실과 다른 지표가 생긴다).
  for (const m of mapping) {
    if (m.field && m.field !== "date" && m.field !== "revenue" && m.emptyRatio === 1) {
      issues.push({ level: "warn", title: `${m.label} 열이 비어 있습니다`, detail: `'${m.column}' 열에 값이 없어 없는 열로 보고 관련 지표는 표시하지 않습니다.` });
      delete idx[m.field];
    }
  }

  const rows: DataRow[] = [];
  const badDates: { line: number; value: string }[] = [];
  const badRevenue: { line: number; value: string }[] = [];
  let negatives = 0;
  const seen = new Set<string>();
  let exactDup = 0;
  const cell = (raw: string[], f: Field) => (idx[f] != null ? String(raw[idx[f]!] ?? "") : undefined);

  body.forEach((raw, i) => {
    if (raw.every((c) => !String(c ?? "").trim())) return; // 빈 줄
    const dateRaw = cell(raw, "date") ?? "";
    const date = normalizeDate(dateRaw);
    if (!date) {
      badDates.push({ line: lineNo(i, headerRow), value: dateRaw.trim() });
      return;
    }
    const revenueRaw = cell(raw, "revenue") ?? "";
    const revenue = num(revenueRaw);
    if (revenue == null) {
      badRevenue.push({ line: lineNo(i, headerRow), value: revenueRaw.trim() });
      return;
    }
    // 모든 값이 같은 행은 같은 내용을 두 번 입력한 것으로 보고 한 번만 반영한다.
    const key = raw.map((c) => String(c ?? "").trim()).join("\u0001");
    if (seen.has(key)) {
      exactDup++;
      return;
    }
    seen.add(key);
    if (revenue < 0) negatives++;

    const n = (f: Field) => num(cell(raw, f));
    const orders = idx.orders != null ? Math.max(1, n("orders") ?? 0) : Math.max(1, Math.round(Math.abs(revenue) / 60000));
    const visitors = idx.visitors != null ? Math.max(orders, n("visitors") ?? 0) : orders * 25;
    const customers = idx.customers != null ? Math.max(1, n("customers") ?? 0) : Math.round(orders * 0.85);
    const returning = idx.returningCustomers != null ? (n("returningCustomers") ?? 0) : Math.round(customers * 0.38);
    rows.push({
      date,
      channel: idx.channel != null ? (cell(raw, "channel")!.trim() || "기타") : "전체",
      product: idx.product != null ? (cell(raw, "product")!.trim() || "기타") : "전체",
      revenue,
      orders,
      visitors,
      customers,
      newCustomers: idx.newCustomers != null ? (n("newCustomers") ?? 0) : Math.max(0, customers - returning),
      returningCustomers: returning,
      conversionRate: idx.conversionRate != null ? (n("conversionRate") ?? 0) : +((orders / visitors) * 100).toFixed(2),
      aov: idx.aov != null ? (n("aov") ?? 0) : Math.round(revenue / orders),
      adSpend: idx.adSpend != null ? (n("adSpend") ?? 0) : 0,
    });
  });

  if (badDates.length) {
    issues.push({
      level: "warn",
      title: `날짜를 읽지 못한 ${badDates.length.toLocaleString("ko-KR")}행은 제외했습니다`,
      detail: `${examples(badDates)}. YYYY-MM-DD, YYYY.MM.DD, 2026년 9월 1일 형식을 읽을 수 있습니다.`,
    });
  }
  if (badRevenue.length) {
    issues.push({
      level: "warn",
      title: `매출이 비었거나 숫자가 아닌 ${badRevenue.length.toLocaleString("ko-KR")}행은 제외했습니다`,
      detail: `${examples(badRevenue)}. 0원이 맞다면 0을 적어주세요.`,
    });
  }
  if (exactDup) {
    issues.push({
      level: "warn",
      title: `완전히 같은 행 ${exactDup.toLocaleString("ko-KR")}개는 한 번만 반영했습니다`,
      detail: "같은 내용을 두 번 붙여넣은 것으로 보입니다. 실제로 같은 거래가 두 번 있었다면 원본에서 구분할 수 있는 열을 추가해주세요.",
    });
  }
  if (negatives) {
    issues.push({ level: "info", title: `매출이 음수인 행이 ${negatives.toLocaleString("ko-KR")}개 있습니다`, detail: "환불로 보고 그대로 합산했습니다." });
  }

  if (rows.length === 0) {
    return {
      rows: [],
      columns: header,
      rowCount: 0,
      mapping,
      issues,
      skipped: badDates.length,
      error: badDates.length
        ? `날짜를 읽을 수 있는 행이 없습니다. 예: ${examples(badDates)}. YYYY-MM-DD 형식으로 적어주세요.`
        : "매출 값을 읽을 수 있는 행이 없습니다. 매출 열에 숫자가 들어 있는지 확인해주세요.",
    };
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  const dates = Array.from(new Set(rows.map((r) => r.date)));
  const start = dates[0];
  const end = dates[dates.length - 1];
  const span = Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
  const missing = span - dates.length;
  if (missing > 0) {
    const set = new Set(dates);
    const gaps: string[] = [];
    for (let t = Date.parse(start); t <= Date.parse(end) && gaps.length < 3; t += 86_400_000) {
      const d = new Date(t).toISOString().slice(0, 10);
      if (!set.has(d)) gaps.push(`${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`);
    }
    issues.push({
      level: missing / span > 0.2 ? "warn" : "info",
      title: `기간 중 ${missing}일은 데이터가 없습니다`,
      detail: `예: ${gaps.join(", ")}. 그날은 0원이 아니라 '기록 없음'으로 보고 계산에서 건너뜁니다.`,
    });
  }
  if (dates.length < 14) {
    issues.push({
      level: "warn",
      title: `${dates.length}일치 데이터라 일부 분석이 제한됩니다`,
      detail: "이전 기간 비교·예측은 14일 이상, 급변 감지는 8일 이상부터 계산합니다.",
    });
  }

  const derived = (["orders", "visitors", "customers", "returningCustomers", "adSpend", "channel", "product"] as DerivedField[]).filter(
    (k) => idx[k] == null
  );
  return {
    rows,
    columns: header,
    rowCount: rows.length,
    derived,
    skipped: badDates.length,
    mapping,
    issues,
    period: { start, end, days: dates.length, missing },
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 엑셀 첫 시트를 문자열 표로 바꾼다.
 * 날짜 셀은 표시 형식(예: 9/1/26)이 아니라 실제 날짜 값으로 읽어 YYYY-MM-DD로 맞춘다.
 */
export async function sheetToTable(buf: ArrayBuffer): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  return raw.map((r) =>
    (r ?? []).map((c) =>
      c instanceof Date ? `${c.getFullYear()}-${pad(c.getMonth() + 1)}-${pad(c.getDate())}` : String(c ?? "")
    )
  );
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return toDataRows(parseCsv(text));
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return toDataRows(await sheetToTable(await file.arrayBuffer()));
  }
  return { rows: [], columns: [], rowCount: 0, error: "CSV 또는 XLSX 파일만 업로드할 수 있습니다." };
}
