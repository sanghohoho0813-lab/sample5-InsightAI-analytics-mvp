import { expect, Page } from "@playwright/test";

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1440) < 640;

/** 페이지 설명줄(비교 기준) — 분석·인사이트 화면에서 범위가 바뀌었는지 확인할 때 쓴다 */
export const scopeLine = (page: Page) => page.locator("main h1 + p").first();

/** 대시보드 브리핑의 기간 줄 — "이번 기간 요약 · 09.15 ~ 10.14 · 이전 30일과 비교" */
export const periodLine = (page: Page) => page.locator('section[aria-labelledby="brief-title"] p').first();

/** 지금 고른 기간 — 데스크톱은 기간 버튼, 모바일은 범위 요약 버튼 */
const rangeButton = (page: Page) =>
  isMobile(page) ? page.getByRole("button", { name: /최근 \d+일|^\d{2}\.\d{2}/ }).first() : page.getByRole("button", { name: /^기간:/ });

/** 기간 프리셋 바꾸기 — 데스크톱은 기간 버튼, 모바일은 범위 시트 */
export async function choosePreset(page: Page, days: 7 | 30 | 90) {
  if (isMobile(page)) {
    await rangeButton(page).click();
    const sheet = page.getByRole("dialog", { name: "분석 범위" });
    await sheet.getByRole("button", { name: `${days}일`, exact: true }).click();
    await sheet.getByRole("button", { name: "적용" }).click();
  } else {
    await rangeButton(page).click();
    await page.getByRole("dialog", { name: "기간 선택" }).getByRole("button", { name: `최근 ${days}일` }).click();
  }
  await expect(rangeButton(page)).toContainText(`최근 ${days}일`);
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

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * 업로드 흐름 테스트용 CSV — 40일 · 채널 2개 · 상품 2개.
 * 마지막 날로부터 6일 전 하루 동안 '자사몰' 방문자·주문이 크게 줄어든다(이상치 하나).
 */
export function storyCsv(): string {
  const end = new Date(Date.UTC(2026, 8, 30));
  const lines = ["날짜,채널,상품,매출,주문수,방문자수,광고비"];
  for (let i = 39; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    for (const ch of ["자사몰", "스마트스토어"]) {
      for (const p of ["A세트", "B세트"]) {
        const drop = ch === "자사몰" && i === 6 ? 0.4 : 1;
        const orders = Math.round(50 * drop);
        lines.push([iso(d), ch, p, orders * 30_000, orders, Math.round(1500 * drop), 90_000].join(","));
      }
    }
  }
  return lines.join("\n") + "\n";
}
