import { expect, test } from "@playwright/test";
import path from "node:path";

const sample = path.resolve("public/sample/insightai-sample.csv");

test.describe("업로드", () => {
  test("예시 CSV를 올려 분석하면 헤더 전환 메뉴와 분석 기록에 남는다", async ({ page }) => {
    await page.goto("/data");
    await page.setInputFiles('input[type="file"]', sample);
    await expect(page.getByText("450행 · 75일치 · 8열")).toBeVisible();
    await page.getByRole("button", { name: "분석 시작" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });

    await page.reload();
    await page.getByRole("button", { name: /분석 데이터 바꾸기/ }).first().click();
    await expect(page.getByRole("menuitemradio", { name: /insightai-sample/ })).toHaveAttribute("aria-checked", "true");
  });

  const cases = [
    ["빈 파일", { name: "empty.csv", mimeType: "text/csv", buffer: Buffer.from("") }, /빈 파일/],
    ["CSV가 아닌 파일", { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") }, /CSV 또는 XLSX/],
    ["필수 컬럼 없음", { name: "x.csv", mimeType: "text/csv", buffer: Buffer.from("When,Value\n2026-01-01,1") }, /날짜·매출/],
    ["날짜 형식 오류", { name: "d.csv", mimeType: "text/csv", buffer: Buffer.from("Date,Revenue\nyesterday,1") }, /날짜 형식/],
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
