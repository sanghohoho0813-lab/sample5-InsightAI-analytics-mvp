import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = ["/dashboard", "/anomalies", "/insights", "/analytics", "/forecast", "/reports", "/data", "/ai", "/settings", "/more", "/intro"];

for (const path of PAGES) {
  test(`${path}: 접근성 위반(심각·치명) 없음, 가로 넘침 없음`, async ({ page }) => {
    await page.goto(path);
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
