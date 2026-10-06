import { expect, test } from "@playwright/test";

test.describe("예외 상태", () => {
  test("없는 주소는 안내가 있는 404를 보여준다", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "찾으시는 페이지가 없습니다" })).toBeVisible();
    await page.getByRole("link", { name: "대시보드로 가기" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("통합된 예전 주소는 새 위치로 보낸다", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/anomalies$/);
    await page.goto("/explore");
    await expect(page).toHaveURL(/\/analytics$/);
  });

  test("저장 데이터가 손상돼도 화면이 멈추지 않는다", async ({ page }) => {
    await page.goto("/dashboard");
    await page.evaluate(() => {
      localStorage.setItem("insightai.reports", JSON.stringify([{ id: 1 }, null, "x"]));
      localStorage.setItem("insightai.history", "{bad json");
      localStorage.setItem("insightai.activeDataset", JSON.stringify({ id: "upload-gone" }));
    });
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "저장한 보고서" })).toBeVisible();
    await page.goto("/data");
    await expect(page.getByRole("heading", { name: "분석 기록" })).toBeVisible();
  });

  test("삭제된 보고서 주소는 목록으로 안내한다", async ({ page }) => {
    await page.goto("/reports?id=rp-missing");
    await expect(page.getByRole("heading", { name: "보고서를 찾을 수 없습니다" })).toBeVisible();
  });
});
