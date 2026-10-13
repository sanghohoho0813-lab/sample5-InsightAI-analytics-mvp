import { ANOMALY_MIN_DAYS, WEEKLY_MIN_DAYS } from "./anomaly-engine";
import { FORECAST_MIN_DAYS } from "./forecast-engine";
import { DataRow, DerivedField, RangePreset } from "./types";

/**
 * 이 데이터로 무엇을 분석할 수 있는지 — 업로드 진단과 데이터 화면이 같은 판단을 쓴다.
 * 할 수 없는 항목은 '왜 안 되는지(어떤 열·몇 일이 더 필요한지)'를 함께 알려준다.
 */
export interface Capability {
  label: string;
  ok: boolean;
  /** 가능하면 무엇을 보여주는지, 불가하면 무엇이 필요한지 */
  note: string;
}

/** 이전 같은 기간과 비교할 수 있도록, 데이터 길이에 맞는 기본 기간을 고른다. */
export function fitPreset(days: number, preferred: Exclude<RangePreset, "custom">): Exclude<RangePreset, "custom"> {
  const want = Number(preferred);
  if (days >= want * 2) return preferred;
  if (days >= 60) return "30";
  if (days >= 14) return "7";
  return preferred;
}

export function capabilities(rows: DataRow[], derived: DerivedField[] = []): Capability[] {
  const days = new Set(rows.map((r) => r.date)).size;
  const has = (f: DerivedField) => !derived.includes(f);
  const count = (dim: "channel" | "product") => new Set(rows.map((r) => r[dim])).size;
  const preset = fitPreset(days, "30");
  const compareDays = Number(preset);
  const channels = count("channel");
  const products = count("product");

  return [
    { label: "매출 추이", ok: days >= 2, note: days >= 2 ? `${days}일치 일별 매출` : "날짜가 2일 이상 필요합니다" },
    {
      label: "이전 기간과 비교",
      ok: days >= 14,
      note: days >= 14 ? `최근 ${compareDays}일 vs 이전 ${compareDays}일` : `14일 이상 필요합니다(지금 ${days}일)`,
    },
    {
      label: "채널별 비교",
      ok: has("channel") && channels > 1,
      note: !has("channel") ? "채널 열이 없습니다" : channels > 1 ? `${channels}개 채널` : "채널이 1개뿐입니다",
    },
    {
      label: "상품별 비교",
      ok: has("product") && products > 1,
      note: !has("product") ? "상품 열이 없습니다" : products > 1 ? `${products}개 상품` : "상품이 1개뿐입니다",
    },
    {
      label: "주문 수·객단가",
      ok: has("orders"),
      note: has("orders") ? "주문 1건당 금액까지 계산" : "주문 수 열이 없습니다",
    },
    {
      label: "매출 원인 분해",
      ok: has("orders"),
      note: !has("orders")
        ? "주문 수 열이 있어야 나눌 수 있습니다"
        : has("visitors")
          ? "방문자 × 전환율 × 객단가"
          : "주문 수 × 객단가(방문자 열이 있으면 전환율까지)",
    },
    {
      label: "전환율",
      ok: has("orders") && has("visitors"),
      note: has("orders") && has("visitors") ? "주문 수 ÷ 방문자" : "방문자·주문 수 열이 모두 필요합니다",
    },
    {
      label: "광고 효율",
      ok: has("adSpend"),
      note: has("adSpend") ? "광고비 1원당 매출, 광고비 증감 대비 주문" : "광고비 열이 없습니다",
    },
    {
      label: "재구매 비중",
      ok: has("customers") && has("returningCustomers"),
      note: has("customers") && has("returningCustomers") ? "재구매 고객 ÷ 구매 고객" : "고객 수·재구매 고객 열이 필요합니다",
    },
    {
      label: "급변 감지",
      ok: days >= ANOMALY_MIN_DAYS,
      note:
        days >= ANOMALY_MIN_DAYS
          ? days >= WEEKLY_MIN_DAYS
            ? "평소(최근 7일·같은 요일)와 다른 날"
            : "평소(최근 7일)와 다른 날 · 요일 패턴은 15일 이상부터"
          : `${ANOMALY_MIN_DAYS}일 이상 필요합니다(지금 ${days}일)`,
    },
    {
      label: "7일 매출 예측",
      ok: days >= FORECAST_MIN_DAYS,
      note: days >= FORECAST_MIN_DAYS ? "최근 추세 기반 추정치" : `${FORECAST_MIN_DAYS}일 이상 필요합니다(지금 ${days}일)`,
    },
  ];
}
