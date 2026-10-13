import { describe, expect, it } from "vitest";
import { parseCsv, toDataRows } from "@/lib/csv";

const table = (csv: string) => toDataRows(parseCsv(csv));

describe("parseCsv", () => {
  it("따옴표 안의 쉼표·줄바꿈·이스케이프된 따옴표를 처리한다", () => {
    expect(parseCsv('a,"b,c","say ""hi"""\r\n1,"2\n3",4')).toEqual([
      ["a", "b,c", 'say "hi"'],
      ["1", "2\n3", "4"],
    ]);
  });

  it("빈 줄은 건너뛴다", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("toDataRows", () => {
  it("영문 헤더와 숫자 표기(₩, 쉼표)를 읽는다", () => {
    const r = table('Date,Revenue,Orders\n2026-09-01,"₩1,200,000",30');
    expect(r.error).toBeUndefined();
    expect(r.rows[0]).toMatchObject({ date: "2026-09-01", revenue: 1_200_000, orders: 30 });
  });

  it("한글 헤더와 YYYY.MM.DD, YYYY/M/D 날짜를 읽는다", () => {
    const r = table("날짜,매출,주문수\n2026.09.01,1000,1\n2026/9/2,2000,2");
    expect(r.rows.map((x) => x.date)).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("'2026년 9월 3일' 형식 날짜를 읽는다", () => {
    expect(table("날짜,매출\n2026년 9월 3일,1000").rows[0]?.date).toBe("2026-09-03");
  });

  it("엑셀이 붙이는 BOM이 있어도 첫 헤더를 인식한다", () => {
    const r = table("﻿Date,Revenue\n2026-09-01,1000");
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
  });

  it("밑줄이 들어간 별칭(order_count, new_customers)도 인식한다", () => {
    const r = table("date,sales,order_count,new_customers\n2026-09-01,1000,4,2");
    expect(r.rows[0]).toMatchObject({ orders: 4, newCustomers: 2 });
    expect(r.derived).not.toContain("orders");
  });

  it("없는 컬럼은 추정으로 채우고 derived에 기록한다", () => {
    const r = table("Date,Revenue\n2026-09-01,1000");
    expect(r.derived).toEqual(expect.arrayContaining(["orders", "visitors", "customers", "channel", "product", "adSpend"]));
  });

  it("날짜를 읽지 못한 행은 건너뛰고 개수를 알려준다", () => {
    const r = table("Date,Revenue\n2026-09-01,1000\nyesterday,5\n,");
    expect(r.rows).toHaveLength(1);
    expect(r.skipped).toBe(1); // 완전히 빈 줄은 '건너뜀'으로 세지 않는다
  });

  it("필수 컬럼이 없으면 오류를 돌려준다", () => {
    expect(table("Day,Revenue\n2026-09-01,1").error).toBeUndefined(); // day는 날짜 별칭
    expect(table("When,Value\n2026-09-01,1").error).toMatch(/날짜·매출/);
    expect(table("Date,Value\n2026-09-01,1").error).toMatch(/^매출 열을 찾지 못했습니다/);
  });

  it("행을 날짜순으로 정렬한다", () => {
    expect(table("Date,Revenue\n2026-09-03,1\n2026-09-01,1").rows.map((x) => x.date)).toEqual(["2026-09-01", "2026-09-03"]);
  });
});

describe("toDataRows — 데이터 진단", () => {
  const issue = (r: ReturnType<typeof table>, re: RegExp) => r.issues?.find((i) => re.test(i.title));

  it("위에 제목 줄이 있으면 날짜·매출 헤더가 있는 줄을 찾아 읽는다", () => {
    const r = table("3분기 판매 실적\n작성: 영업팀\n날짜,매출\n2026-09-01,1000");
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
    expect(issue(r, /위쪽 2줄은 제목/)).toBeTruthy();
  });

  it("열마다 무엇으로 인식했는지 알려주고, 모르는 열은 쓰지 않는다", () => {
    const r = table("날짜,매출액,메모\n2026-09-01,1000,x");
    expect(r.mapping?.map((m) => [m.column, m.label])).toEqual([
      ["날짜", "날짜"],
      ["매출액", "매출"],
      ["메모", null],
    ]);
  });

  it("없는 날짜(2026-02-30, 13월)는 읽지 않고 행 번호와 함께 알려준다", () => {
    const r = table("날짜,매출\n2026-09-01,1\n2026-02-30,1\n2026-13-01,1");
    expect(r.rows).toHaveLength(1);
    expect(issue(r, /날짜를 읽지 못한 2행/)?.detail).toMatch(/3행 '2026-02-30', 4행 '2026-13-01'/);
  });

  it("매출이 비었거나 숫자가 아닌 행은 0으로 채우지 않고 제외한다", () => {
    const r = table("날짜,매출\n2026-09-01,1000\n2026-09-02,\n2026-09-03,N/A\n2026-09-04,\"1,200원\"");
    expect(r.rows.map((x) => x.revenue)).toEqual([1000, 1200]);
    expect(issue(r, /매출이 비었거나 숫자가 아닌 2행/)).toBeTruthy();
  });

  it("완전히 같은 행은 한 번만 반영하고 알려준다", () => {
    const r = table("날짜,채널,매출\n2026-09-01,웹,1000\n2026-09-01,웹,1000\n2026-09-01,앱,1000");
    expect(r.rows).toHaveLength(2);
    expect(issue(r, /완전히 같은 행 1개/)).toBeTruthy();
  });

  it("값이 전부 빈 열은 없는 열로 보고, 그 지표를 추정치로 표시한다", () => {
    const r = table("날짜,매출,광고비\n2026-09-01,1000,\n2026-09-02,1000,");
    expect(r.derived).toContain("adSpend");
    expect(issue(r, /광고비 열이 비어 있습니다/)).toBeTruthy();
  });

  it("기록이 없는 날과 짧은 기간을 알려준다", () => {
    const r = table("날짜,매출\n2026-09-01,1\n2026-09-02,1\n2026-09-05,1");
    expect(r.period).toEqual({ start: "2026-09-01", end: "2026-09-05", days: 3, missing: 2 });
    expect(issue(r, /기간 중 2일은 데이터가 없습니다/)?.detail).toMatch(/9월 3일, 9월 4일/);
    expect(issue(r, /3일치 데이터라/)).toBeTruthy();
  });

  it("같은 항목으로 보이는 열이 둘이면 앞의 열만 쓴다", () => {
    const r = table("날짜,매출,매출액\n2026-09-01,1000,9999");
    expect(r.rows[0].revenue).toBe(1000);
    expect(r.mapping?.[2].duplicate).toBe(true);
  });
});

describe("capabilities — 이 데이터로 할 수 있는 분석", () => {
  it("열과 기간에 따라 가능·불가와 그 이유를 알려준다", async () => {
    const { capabilities } = await import("@/lib/capabilities");
    const r = table("날짜,매출\n" + Array.from({ length: 10 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")},1000`).join("\n"));
    const caps = Object.fromEntries(capabilities(r.rows, r.derived).map((c) => [c.label, c]));
    expect(caps["매출 추이"].ok).toBe(true);
    expect(caps["급변 감지"].ok).toBe(true);
    expect(caps["7일 매출 예측"]).toMatchObject({ ok: false, note: "14일 이상 필요합니다(지금 10일)" });
    expect(caps["광고 효율"]).toMatchObject({ ok: false, note: "광고비 열이 없습니다" });
    expect(caps["채널별 비교"].note).toBe("채널 열이 없습니다");
  });

  it("이전 기간과 비교할 수 있게 데이터 길이에 맞는 기본 기간을 고른다", async () => {
    const { fitPreset } = await import("@/lib/capabilities");
    expect(fitPreset(90, "30")).toBe("30");
    expect(fitPreset(59, "30")).toBe("7");
    expect(fitPreset(10, "30")).toBe("30");
    expect(fitPreset(200, "90")).toBe("90");
    expect(fitPreset(100, "90")).toBe("30");
  });
});

describe("sheetToTable (XLSX)", () => {
  it("날짜 셀을 표시 형식이 아니라 YYYY-MM-DD로 읽는다", async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([
      ["날짜", "매출"],
      [new Date(2026, 8, 1), 1000],
      ["2026-09-02", "2,000"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "data");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const { sheetToTable } = await import("@/lib/csv");
    const r = toDataRows(await sheetToTable(buf));
    expect(r.error).toBeUndefined();
    expect(r.rows.map((x) => [x.date, x.revenue])).toEqual([
      ["2026-09-01", 1000],
      ["2026-09-02", 2000],
    ]);
  });
});
