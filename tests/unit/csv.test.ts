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
    expect(table("Date,Value\n2026-09-01,1").error).toMatch(/날짜·매출/);
  });

  it("행을 날짜순으로 정렬한다", () => {
    expect(table("Date,Revenue\n2026-09-03,1\n2026-09-01,1").rows.map((x) => x.date)).toEqual(["2026-09-01", "2026-09-03"]);
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
