import AxeBuilder from "@axe-core/playwright";
import { expect, Page, test } from "@playwright/test";

const PAGES = ["/dashboard", "/anomalies", "/insights", "/analytics", "/forecast", "/reports", "/data", "/ai", "/settings", "/more", "/intro"];

/** 조사 화면처럼 목록에서 들어가야 하는 화면 — 시작 주소와 들어가는 방법 */
const FLOWS: { name: string; path: string; enter?: (page: Page) => Promise<void> }[] = [
  ...PAGES.map((path) => ({ name: path, path })),
  {
    name: "/anomalies?id= (조사 화면)",
    path: "/anomalies",
    enter: async (page) => {
      await page.locator('a[href^="/anomalies?id="]').first().click();
      await expect(page.getByRole("heading", { level: 2, name: /지금 할 일/ })).toBeVisible();
    },
  },
  {
    name: "/reports?id= (보고서 문서 · 목차)",
    path: "/dashboard",
    enter: async (page) => {
      await page.getByRole("button", { name: "보고서로 저장" }).first().click();
      await page.getByRole("link", { name: "보고서 열기" }).click();
      await expect(page.getByRole("heading", { name: "6. 생성 시점" })).toBeVisible();
    },
  },
];

for (const { name, path, enter } of FLOWS) {
  test(`${name}: 접근성 위반(심각·치명) 없음, 가로 넘침 없음`, async ({ page }) => {
    await page.goto(path);
    await enter?.(page);
    await page.waitForLoadState("networkidle");

    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // 공용 뒤로·앞으로 버튼은 별도 스크립트(public/mirae-history-nav.js)라 검사에서 뺀다.
      .exclude("[data-mirae-history-nav]")
      .analyze();
    const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`)).toEqual([]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
