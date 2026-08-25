import { DataRow } from "./types";

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

const HEADER_ALIASES: Record<keyof Omit<DataRow, "aov" | "conversionRate"> | "aov" | "conversionRate", string[]> = {
  date: ["date", "날짜", "일자", "day"],
  channel: ["channel", "채널"],
  product: ["product", "상품", "제품", "item"],
  revenue: ["revenue", "매출", "매출액", "sales", "amount"],
  orders: ["orders", "주문", "주문수", "order_count"],
  visitors: ["visitors", "방문자", "방문자수", "sessions", "traffic"],
  customers: ["customers", "고객", "고객수"],
  newCustomers: ["newcustomers", "new_customers", "신규고객", "신규고객수"],
  returningCustomers: ["returningcustomers", "returning_customers", "재구매고객", "재구매고객수"],
  conversionRate: ["conversionrate", "conversion_rate", "전환율", "cvr"],
  aov: ["aov", "객단가", "평균주문금액"],
  adSpend: ["adspend", "ad_spend", "광고비", "adcost"],
};

export const REQUIRED_COLUMNS = ["Date", "Revenue", "Orders"];
export const SUPPORTED_COLUMNS = [
  "Date", "Revenue", "Orders", "Visitors", "Customers", "NewCustomers",
  "ReturningCustomers", "ConversionRate", "AOV", "Channel", "Product", "AdSpend",
];

function normalizeDate(v: string): string | null {
  const s = v.trim().replace(/[./]/g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function num(v: string | undefined): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[₩,%\s,]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface ParseResult {
  rows: DataRow[];
  columns: string[];
  rowCount: number;
  error?: string;
}

/** 헤더 별칭 매핑으로 업로드 데이터를 표준 DataRow로 변환 */
export function toDataRows(table: string[][]): ParseResult {
  if (table.length < 2) {
    return { rows: [], columns: [], rowCount: 0, error: "데이터 행이 없습니다. 헤더와 1개 이상의 행이 필요합니다." };
  }
  const header = table[0].map((h) => h.trim());
  const norm = header.map((h) => h.toLowerCase().replace(/[\s_-]/g, ""));
  const idx: Partial<Record<keyof DataRow, number>> = {};
  (Object.keys(HEADER_ALIASES) as (keyof DataRow)[]).forEach((key) => {
    const found = norm.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (found >= 0) idx[key] = found;
  });

  if (idx.date == null || idx.revenue == null) {
    return {
      rows: [], columns: header, rowCount: table.length - 1,
      error: "필수 컬럼(Date, Revenue)을 찾을 수 없습니다. 파일 구조를 확인해주세요.",
    };
  }

  const rows: DataRow[] = [];
  for (const raw of table.slice(1)) {
    const date = normalizeDate(raw[idx.date] ?? "");
    if (!date) continue;
    const revenue = num(raw[idx.revenue!]);
    const orders = idx.orders != null ? Math.max(1, num(raw[idx.orders])) : Math.max(1, Math.round(revenue / 60000));
    const visitors = idx.visitors != null ? Math.max(orders, num(raw[idx.visitors])) : orders * 25;
    const customers = idx.customers != null ? Math.max(1, num(raw[idx.customers])) : Math.round(orders * 0.85);
    const returning = idx.returningCustomers != null ? num(raw[idx.returningCustomers]) : Math.round(customers * 0.38);
    rows.push({
      date,
      channel: idx.channel != null ? (raw[idx.channel] || "기타").trim() : "전체",
      product: idx.product != null ? (raw[idx.product] || "기타").trim() : "전체",
      revenue,
      orders,
      visitors,
      customers,
      newCustomers: idx.newCustomers != null ? num(raw[idx.newCustomers]) : Math.max(0, customers - returning),
      returningCustomers: returning,
      conversionRate: idx.conversionRate != null ? num(raw[idx.conversionRate]) : +((orders / visitors) * 100).toFixed(2),
      aov: idx.aov != null ? num(raw[idx.aov]) : Math.round(revenue / orders),
      adSpend: idx.adSpend != null ? num(raw[idx.adSpend]) : 0,
    });
  }
  if (rows.length === 0) {
    return { rows: [], columns: header, rowCount: 0, error: "유효한 날짜 형식(YYYY-MM-DD)의 행을 찾지 못했습니다." };
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, columns: header, rowCount: rows.length };
}

export async function parseFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) {
    const text = await file.text();
    return toDataRows(parseCsv(text));
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const table = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false }) as string[][];
    return toDataRows(table.map((r) => (r ?? []).map((c) => String(c ?? ""))));
  }
  return { rows: [], columns: [], rowCount: 0, error: "CSV 또는 XLSX 파일만 업로드할 수 있습니다." };
}
