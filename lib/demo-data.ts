import { DataRow, DemoDataset } from "./types";

/** 결정적 난수 (매 렌더 동일한 데이터 보장) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateRange(endDate: string, days: number): string[] {
  const end = new Date(endDate + "T00:00:00Z");
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

interface ChannelSpec {
  name: string;
  share: number; // 매출 비중
  conv: number; // 기본 전환율 %
  aov: number; // 기본 객단가
  adRatio: number; // 매출 대비 광고비
  weekendBoost: number; // 주말 계수 (1보다 크면 주말 강세)
}

interface StoryEvent {
  from: number; // day index (0-based from start)
  to: number;
  channel?: string;
  revenueMul?: number;
  visitorMul?: number;
  convMul?: number;
  aovMul?: number;
}

interface GenSpec {
  seed: number;
  endDate: string;
  days: number;
  dailyRevenue: number; // 전체 일평균 매출
  growth: number; // 기간 전체 성장 계수 (0.2 = 기간 말 +20%)
  channels: ChannelSpec[];
  products: { name: string; share: number; lateBoost?: number }[];
  events: StoryEvent[];
}

function generate(spec: GenSpec): DataRow[] {
  const rand = mulberry32(spec.seed);
  const dates = dateRange(spec.endDate, spec.days);
  const rows: DataRow[] = [];

  dates.forEach((date, di) => {
    const t = di / (spec.days - 1);
    const growthMul = 1 + spec.growth * t;
    const dow = new Date(date + "T00:00:00Z").getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    // 완만한 주간 리듬 + 노이즈
    const weekWave = 1 + 0.06 * Math.sin((di / 7) * Math.PI * 2);

    for (const ch of spec.channels) {
      let revenueBase = spec.dailyRevenue * ch.share * growthMul * weekWave;
      revenueBase *= isWeekend ? ch.weekendBoost : 1;
      let conv = ch.conv;
      let aov = ch.aov;
      let visitorMul = 1;

      for (const ev of spec.events) {
        if (di >= ev.from && di <= ev.to && (!ev.channel || ev.channel === ch.name)) {
          if (ev.revenueMul) revenueBase *= ev.revenueMul;
          if (ev.convMul) conv *= ev.convMul;
          if (ev.aovMul) aov *= ev.aovMul;
          if (ev.visitorMul) visitorMul *= ev.visitorMul;
        }
      }

      // 채널 일 단위 노이즈
      const noise = 0.92 + rand() * 0.16;
      revenueBase *= noise;
      conv *= 0.95 + rand() * 0.1;
      aov *= 0.97 + rand() * 0.06;

      for (const p of spec.products) {
        let pShare = p.share;
        // 기간 후반 특정 상품 가속 (최근 2주 성장 스토리)
        if (p.lateBoost && di >= spec.days - 14) {
          const lt = (di - (spec.days - 14)) / 13;
          pShare *= 1 + p.lateBoost * lt;
        }
        const revenue = Math.max(0, Math.round(revenueBase * pShare * (0.9 + rand() * 0.2)));
        const rowAov = aov * (0.92 + rand() * 0.16);
        const orders = Math.max(1, Math.round(revenue / rowAov));
        const rowConv = Math.min(12, conv * (0.95 + rand() * 0.1));
        const visitors = Math.max(orders, Math.round((orders / (rowConv / 100)) * visitorMul));
        const customers = Math.max(1, Math.round(orders * (0.82 + rand() * 0.08)));
        const returning = Math.round(customers * (0.34 + rand() * 0.08 + 0.06 * t));
        const adSpend = Math.round(revenue * ch.adRatio * (0.85 + rand() * 0.3));

        rows.push({
          date,
          channel: ch.name,
          product: p.name,
          revenue,
          orders,
          visitors,
          customers,
          newCustomers: customers - returning,
          returningCustomers: returning,
          conversionRate: +((orders / visitors) * 100).toFixed(2),
          aov: Math.round(revenue / orders),
          adSpend,
        });
      }
    }
  });
  return rows;
}

const DAYS = 90;

function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 데모 데이터는 항상 '오늘'까지의 최근 90일을 사용한다. */
function todayISO(): string {
  return isoDay(new Date());
}

/** 스토리 이벤트를 마지막 날 기준 상대 인덱스로 지정한다(n일 전). */
const ago = (n: number) => DAYS - 1 - n;

/**
 * 이커머스 데모 스토리 (마지막 날 = 오늘)
 * - 21~15일 전: 프로모션으로 모바일 중심 매출 급증
 * - 11일 전: 웹사이트 트래픽 급감(수집 장애)
 * - 11~7일 전: 모바일 결제 이탈 증가
 * - 6일 전~오늘: 검색광고 유입(웹사이트) 전환율 개선, 객단가 상승
 * - 최근 2주: "비타민 세럼" 판매 가속
 */
function ecommerceRows(endDate: string): DataRow[] {
  return generate({
    seed: 20240531,
    endDate,
    days: DAYS,
    dailyRevenue: 38_000_000,
    growth: 0.24,
    channels: [
      { name: "웹사이트", share: 0.486, conv: 3.7, aov: 68_000, adRatio: 0.06, weekendBoost: 0.92 },
      { name: "모바일 앱", share: 0.287, conv: 4.4, aov: 58_000, adRatio: 0.08, weekendBoost: 1.12 },
      { name: "스마트스토어", share: 0.123, conv: 3.1, aov: 52_000, adRatio: 0.11, weekendBoost: 1.05 },
      { name: "기타", share: 0.104, conv: 2.6, aov: 61_000, adRatio: 0.05, weekendBoost: 1.0 },
    ],
    products: [
      { name: "시그니처 크림", share: 0.34 },
      { name: "비타민 세럼", share: 0.22, lateBoost: 0.55 },
      { name: "수분 토너", share: 0.26 },
      { name: "선케어 스틱", share: 0.18 },
    ],
    events: [
      // 프로모션(21~15일 전): 전 채널 상승, 모바일 특히 강세
      { from: ago(21), to: ago(15), revenueMul: 1.32 },
      { from: ago(21), to: ago(15), channel: "모바일 앱", revenueMul: 1.18, convMul: 1.15 },
      // 11일 전: 웹사이트 트래픽 급감
      { from: ago(11), to: ago(11), channel: "웹사이트", revenueMul: 0.62, visitorMul: 0.55 },
      // 11~7일 전: 모바일 결제 이탈 증가 (전환율 하락)
      { from: ago(11), to: ago(7), channel: "모바일 앱", convMul: 0.72, revenueMul: 0.88 },
      // 6일 전~오늘: 검색광고 전환 개선 + 객단가 상승
      { from: ago(6), to: ago(0), channel: "웹사이트", convMul: 1.22, revenueMul: 1.14, aovMul: 1.1 },
      { from: ago(6), to: ago(0), aovMul: 1.08 },
    ],
  });
}

function marketingRows(endDate: string): DataRow[] {
  return generate({
    seed: 7714,
    endDate,
    days: DAYS,
    dailyRevenue: 21_000_000,
    growth: 0.18,
    channels: [
      { name: "검색 광고", share: 0.41, conv: 4.6, aov: 72_000, adRatio: 0.22, weekendBoost: 0.9 },
      { name: "SNS 광고", share: 0.31, conv: 2.9, aov: 54_000, adRatio: 0.28, weekendBoost: 1.15 },
      { name: "디스플레이", share: 0.16, conv: 2.2, aov: 60_000, adRatio: 0.24, weekendBoost: 1.0 },
      { name: "이메일", share: 0.12, conv: 5.8, aov: 66_000, adRatio: 0.03, weekendBoost: 0.95 },
    ],
    products: [
      { name: "신규 가입 캠페인", share: 0.38 },
      { name: "재구매 캠페인", share: 0.27, lateBoost: 0.4 },
      { name: "시즌 프로모션", share: 0.22 },
      { name: "브랜드 캠페인", share: 0.13 },
    ],
    events: [
      { from: ago(34), to: ago(27), channel: "SNS 광고", revenueMul: 1.28 },
      { from: ago(15), to: ago(15), channel: "디스플레이", revenueMul: 0.55, visitorMul: 0.6 },
      { from: ago(11), to: ago(0), channel: "검색 광고", convMul: 1.25, revenueMul: 1.12 },
    ],
  });
}

function retailRows(endDate: string): DataRow[] {
  return generate({
    seed: 3391,
    endDate,
    days: DAYS,
    dailyRevenue: 29_000_000,
    growth: 0.12,
    channels: [
      { name: "강남점", share: 0.36, conv: 22, aov: 41_000, adRatio: 0.02, weekendBoost: 1.25 },
      { name: "홍대점", share: 0.27, conv: 19, aov: 33_000, adRatio: 0.02, weekendBoost: 1.4 },
      { name: "판교점", share: 0.22, conv: 24, aov: 45_000, adRatio: 0.02, weekendBoost: 0.7 },
      { name: "부산점", share: 0.15, conv: 18, aov: 36_000, adRatio: 0.02, weekendBoost: 1.2 },
    ],
    products: [
      { name: "시그니처 라떼", share: 0.31 },
      { name: "시즌 한정 메뉴", share: 0.24, lateBoost: 0.5 },
      { name: "디저트 세트", share: 0.25 },
      { name: "원두/굿즈", share: 0.2 },
    ],
    events: [
      { from: ago(29), to: ago(23), revenueMul: 1.22 },
      { from: ago(19), to: ago(16), channel: "홍대점", revenueMul: 0.68, visitorMul: 0.7 },
      { from: ago(9), to: ago(0), channel: "강남점", aovMul: 1.15, revenueMul: 1.1 },
    ],
  });
}

let cache: DemoDataset[] | null = null;
let cacheDay = "";

export function getDemoDatasets(): DemoDataset[] {
  const end = todayISO();
  // 날짜가 바뀌면(자정 경과) 최근 구간으로 다시 생성한다.
  if (cache && cacheDay === end) return cache;
  cacheDay = end;
  const dates = dateRange(end, DAYS);
  const periodLabel = `${dates[0].replaceAll("-", ".")} ~ ${dates[dates.length - 1].replaceAll("-", ".")}`;
  cache = [
    {
      id: "demo-ecommerce",
      name: "이커머스 판매 데이터",
      description: "뷰티 커머스 최근 90일 판매 데이터. 프로모션·트래픽 급감·광고 전환 개선 스토리가 담겨 있습니다.",
      category: "이커머스",
      rows: ecommerceRows(end),
      channels: ["웹사이트", "모바일 앱", "스마트스토어", "기타"],
      products: ["시그니처 크림", "비타민 세럼", "수분 토너", "선케어 스틱"],
      periodLabel,
    },
    {
      id: "demo-marketing",
      name: "마케팅 성과 데이터",
      description: "채널별 광고 성과 최근 90일 데이터. 검색·SNS·디스플레이·이메일 채널 효율을 비교할 수 있습니다.",
      category: "마케팅",
      rows: marketingRows(end),
      channels: ["검색 광고", "SNS 광고", "디스플레이", "이메일"],
      products: ["신규 가입 캠페인", "재구매 캠페인", "시즌 프로모션", "브랜드 캠페인"],
      periodLabel,
    },
    {
      id: "demo-retail",
      name: "매장 매출 데이터",
      description: "4개 매장의 최근 90일 매출 데이터. 지점별 방문·객단가·주말 패턴을 분석할 수 있습니다.",
      category: "오프라인 리테일",
      rows: retailRows(end),
      channels: ["강남점", "홍대점", "판교점", "부산점"],
      products: ["시그니처 라떼", "시즌 한정 메뉴", "디저트 세트", "원두/굿즈"],
      periodLabel,
    },
  ];
  return cache;
}

export function getDemoDataset(id: string): DemoDataset | undefined {
  return getDemoDatasets().find((d) => d.id === id);
}
