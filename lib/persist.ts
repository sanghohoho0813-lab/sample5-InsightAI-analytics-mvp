import { getDemoDataset } from "./demo-data";
import { AnalysisRecord, DemoDataset, SavedReport } from "./types";

/**
 * 브라우저 저장소(localStorage) 접근을 한곳에 모은다.
 * - 모든 키는 PREFIX로 시작한다 → 데모 초기화 때 한 번에 지운다.
 * - 읽을 때 형태를 검증해, 손상되었거나 예전 버전의 항목은 버린다(화면이 깨지지 않게).
 * - 쓰기 실패(용량 초과·시크릿 모드)는 false로 돌려주고 호출부가 대응한다.
 */

export const PREFIX = "insightai.";
export const KEYS = {
  history: `${PREFIX}history`,
  active: `${PREFIX}activeDataset`,
  read: `${PREFIX}readNotifications`,
  reports: `${PREFIX}reports`,
  settings: `${PREFIX}settings`,
  uploads: `${PREFIX}uploads`,
} as const;

/** 업로드 원본은 용량이 커서 최근 몇 개만 보관한다. */
export const MAX_UPLOADS = 3;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** 저장된 목록에서 형태가 맞지 않는 항목(손상·구버전)은 버린다. */
export function readList<T>(key: string, valid: (x: T) => boolean): T[] {
  const raw = readJson<unknown>(key, []);
  return Array.isArray(raw) ? (raw as T[]).filter((x) => x != null && valid(x)) : [];
}

export const isValidReport = (r: SavedReport) =>
  typeof r.id === "string" &&
  typeof r.title === "string" &&
  !!r.scope?.start &&
  Array.isArray(r.kpis) &&
  Array.isArray(r.findings) &&
  Array.isArray(r.anomalies) &&
  Array.isArray(r.recommendations) &&
  Array.isArray(r.forecasts);

export const isValidRecord = (h: AnalysisRecord) =>
  typeof h.id === "string" && typeof h.datasetId === "string" && typeof h.createdAt === "string";

export const isValidUpload = (d: DemoDataset) =>
  typeof d.id === "string" && Array.isArray(d.rows) && d.rows.length > 0 && Array.isArray(d.channels) && Array.isArray(d.products);

export const readUploads = () => readList<DemoDataset>(KEYS.uploads, isValidUpload);

/** 같은 파일인지 — 이름과 행 수가 같으면 다시 올린 것으로 본다. */
export const sameFile = (a: DemoDataset, b: DemoDataset) => a.name === b.name && a.rows.length === b.rows.length;

/**
 * 업로드 원본 보관 — 최근 MAX_UPLOADS개까지, 같은 파일은 대체한다.
 * 용량이 모자라면 오래된 것부터 비우며 재시도하고, 끝내 못 넣으면 false.
 */
export function storeUpload(ds: DemoDataset): boolean {
  let list = [ds, ...readUploads().filter((d) => d.id !== ds.id && !sameFile(d, ds))].slice(0, MAX_UPLOADS);
  while (list.length > 0) {
    if (writeJson(KEYS.uploads, list)) return list.some((d) => d.id === ds.id);
    list = list.slice(0, -1);
  }
  return false;
}

/** 샘플은 코드에서, 업로드는 저장소에서 찾는다. */
export function findDataset(id: string): DemoDataset | null {
  if (id.startsWith("demo-")) return getDemoDataset(id) ?? null;
  return readUploads().find((d) => d.id === id) ?? null;
}

/** PREFIX로 시작하는 키를 모두 지운다(데모 초기화·오류 복구). */
export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // 저장소 접근 불가 환경 무시
  }
}
