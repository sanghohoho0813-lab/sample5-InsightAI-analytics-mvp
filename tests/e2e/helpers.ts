import { expect, Page } from "@playwright/test";

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 640;

/** 페이지 설명줄(비교 기준) — 범위가 바뀌었는지 확인할 때 쓴다 */
export const scopeLine = (page: Page) => page.locator("main h1 + p").first();

/** 기간 프리셋 바꾸기 — 데스크톱은 기간 버튼, 모바일은 범위 시트 */
export async function choosePreset(page: Page, days: 7 | 30 | 90) {
  if (isMobile(page)) {
    await page.getByRole("button", { name: /최근 \d+일|^\d{2}\.\d{2}/ }).first().click();
    const sheet = page.getByRole("dialog", { name: "분석 범위" });
    await sheet.getByRole("button", { name: `${days}일`, exact: true }).click();
    await sheet.getByRole("button", { name: "적용" }).click();
  } else {
    await page.getByRole("button", { name: /^기간:/ }).click();
    await page.getByRole("dialog", { name: "기간 선택" }).getByRole("button", { name: `최근 ${days}일` }).click();
  }
  await expect(scopeLine(page)).toContainText(`최근 ${days}일`);
}

/** 콘솔 오류·페이지 예외를 모아 테스트 끝에 0건인지 확인한다 */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errors.push(m.text());
  });
  return errors;
}
