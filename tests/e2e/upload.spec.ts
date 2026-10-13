import { expect, test } from "@playwright/test";
import path from "node:path";
import { storyCsv } from "./helpers";

const sample = path.resolve("public/sample/insightai-sample.csv");
const csv = (name: string, text: string) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) });

test.describe("업로드", () => {
  test("예시 CSV: 열 인식 → 분석 가능 항목 → 기간 → 품질 확인을 보여준 뒤 분석한다", async ({ page }) => {
    await page.goto("/data");
    await page.setInputFiles('input[type="file"]', sample);
    await expect(page.getByText("450행 · 75일치 · 8열")).toBeVisible();
    for (const h of ["열 인식", "이 파일로 분석할 수 있는 것", "기간", "데이터 품질"]) {
      await expect(page.getByRole("heading", { level: 3, name: h })).toBeVisible();
    }
    await page.getByRole("button", { name: "이대로 분석 시작" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });

    await page.reload();
    await page.getByRole("button", { name: /분석 데이터 바꾸기/ }).first().click();
    await expect(page.getByRole("menuitemradio", { name: /insightai-sample/ })).toHaveAttribute("aria-checked", "true");
  });

  test("문제가 섞인 파일: 제목 줄·잘못된 날짜·빈 매출·중복 행을 알려주고, 고칠 수 있는 만큼 고쳐 분석한다", async ({ page }) => {
    const body = storyCsv().split("\n");
    const messy = ["2026년 9월 판매 실적", body[0], body[1], "2026-02-30,자사몰,A세트,1000,1,10,0", "2026-08-22,자사몰,A세트,,1,10,0", body[2], body[2], ...body.slice(3)].join("\n");
    await page.goto("/data");
    await page.setInputFiles('input[type="file"]', csv("messy.csv", messy));
    const quality = page.locator('section[aria-labelledby="diag-4"]');
    await expect(quality).toContainText("위쪽 1줄은 제목으로 보고 건너뛰었습니다");
    await expect(quality).toContainText("날짜를 읽지 못한 1행은 제외했습니다");
    await expect(quality).toContainText("매출이 비었거나 숫자가 아닌 1행은 제외했습니다");
    await expect(quality).toContainText("완전히 같은 행 1개는 한 번만 반영했습니다");
    await page.getByRole("button", { name: "이대로 분석 시작" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
  });

  test("열이 적은 파일은 분석할 수 없는 지표와 그 이유를 먼저 알려준다", async ({ page }) => {
    const rows = Array.from({ length: 10 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")},${1000 + i}`);
    await page.goto("/data");
    await page.setInputFiles('input[type="file"]', csv("short.csv", ["Date,Revenue", ...rows].join("\n")));
    const caps = page.locator('section[aria-labelledby="diag-2"]');
    await expect(caps).toContainText("이 파일로는 계산하지 않는 것");
    await expect(caps).toContainText("7일 매출 예측 · 14일 이상 필요합니다(지금 10일)");
    await expect(caps).toContainText("광고 효율 · 광고비 열이 없습니다");
  });

  const cases = [
    ["빈 파일", { name: "empty.csv", mimeType: "text/csv", buffer: Buffer.from("") }, /빈 파일/],
    ["CSV가 아닌 파일", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") }, /CSV 또는 XLSX/],
    ["필수 컬럼 없음", csv("x.csv", "When,Value\n2026-01-01,1"), /날짜·매출 열을 찾지 못했습니다/],
    ["날짜 형식 오류", csv("d.csv", "Date,Revenue\nyesterday,1"), /날짜를 읽을 수 있는 행이 없습니다/],
  ] as const;
  for (const [label, file, message] of cases) {
    test(`${label}: 이유를 알려주고 다시 고를 수 있게 한다`, async ({ page }) => {
      await page.goto("/data");
      await page.setInputFiles('input[type="file"]', file);
      const alert = page.locator('main [role="alert"]');
      await expect(alert).toContainText(message);
      await alert.getByRole("button", { name: "다른 파일 선택" }).click();
      await expect(page.getByRole("button", { name: "파일 선택", exact: true })).toBeVisible();
    });
  }
});

/** 사용자가 요청한 실제 업무 흐름 — 업로드 → 분석 → 이상치 조사 → 보고서 저장 */
test("업로드 → 분석 → 이상치 조사 → 보고서 저장까지 한 번에", async ({ page }) => {
  await page.goto("/data");
  await page.setInputFiles('input[type="file"]', csv("9월-판매.csv", storyCsv()));
  await expect(page.locator('section[aria-labelledby="diag-4"]')).toContainText("문제 없음");
  await page.getByRole("button", { name: "이대로 분석 시작" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });

  // 40일치 → 이전 기간과 비교되도록 '최근 7일'이 아니라 데이터에 맞는 기간으로 연다.
  const brief = page.locator('section[aria-labelledby="brief-title"]');
  await expect(brief.locator("p").first()).toContainText("이전 7일과 비교");

  // 6일 전 자사몰 급감이 '평소와 달랐던 날'에 나오고, 누르면 조사 화면으로 간다.
  const row = page.locator('a[href^="/anomalies?id="]', { hasText: "자사몰" }).first();
  await expect(row).toContainText("급감");
  await row.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("자사몰");
  await expect(page.locator('section[aria-labelledby="step-2"]')).toContainText("다음 날 평소 수준으로 돌아왔습니다");
  await expect(page.locator('section[aria-labelledby="step-3"]')).toContainText("상품별");
  await expect(page.locator('section[aria-labelledby="step-5"] li').first()).toBeVisible();
  await page.getByRole("link", { name: /대시보드로 돌아가기/ }).click();

  await page.getByRole("button", { name: "보고서로 저장" }).first().click();
  await page.getByRole("link", { name: "보고서 열기" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("9월-판매");
  await expect(page.locator('article[aria-label="보고서 본문"]')).toContainText("업로드 데이터");
  await expect(page.locator('section[aria-labelledby="r-scope"]')).toContainText("9월-판매");
  await expect(page.locator('section[aria-labelledby="r-meta"]')).toContainText("저장한 순간의 계산 결과");
});
