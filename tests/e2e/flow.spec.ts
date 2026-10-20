import { expect, test } from "@playwright/test";
import { collectErrors, isMobile, storyCsv } from "./helpers";

const csv = (name: string, text: string) => ({ name, mimeType: "text/csv", buffer: Buffer.from(text) });

test.describe("읽고 넘기는 흐름", () => {
  test("추이 차트의 점을 누르면 그날의 조사 화면으로 간다", async ({ page }) => {
    await page.goto("/dashboard");
    const dots = page.locator("g.recharts-reference-dot");
    await expect(dots.first()).toBeAttached();
    await expect(page.getByText("평소와 달랐던 날 · 점을 누르면 조사")).toBeVisible();
    await dots.first().locator("circle").last().click({ force: true }); // SVG 점 — 같은 조사는 목록 링크로도 열 수 있다
    await expect(page).toHaveURL(/\/anomalies\?id=.+&from=%2Fdashboard/);
    await expect(page.getByRole("heading", { level: 2, name: /무슨 변화인가/ })).toBeVisible();
  });

  test("조사 화면: 이전·다음으로 넘기며 확인하고, 마지막에는 출발 화면으로 돌아간다", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/dashboard");
    await page.locator('a[href^="/anomalies?id="]').first().click();
    const bar = page.getByRole("navigation", { name: "변화 넘겨보기" });
    await expect(bar).toContainText(/1 \/ \d+/);
    const total = Number((await bar.textContent())!.match(/1 \/ (\d+)/)![1]);
    expect(total).toBeGreaterThan(1);
    await expect(bar.getByRole("button", { name: "이전 변화" })).toBeDisabled();

    const firstTitle = await page.getByRole("heading", { level: 1 }).textContent();
    await bar.getByRole("button", { name: "다음 변화" }).click();
    await expect(bar).toContainText(`2 / ${total}`);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(firstTitle!);

    // 맨 아래 '확인했어요 · 다음 보기'로도 넘어간다.
    await page.getByRole("button", { name: /확인했어요 · 다음 보기/ }).click();
    await expect(bar).toContainText(`3 / ${total}`);

    let at = 3;
    if (!isMobile(page)) {
      await page.keyboard.press("ArrowLeft");
      await expect(bar).toContainText(`2 / ${total}`);
      at = 2;
    }

    // 끝까지 넘기면 '확인 완료'로 출발 화면에 돌아간다.
    for (; at < total; at++) {
      await bar.getByRole("button", { name: "다음 변화" }).click();
      await expect(bar).toContainText(`${at + 1} / ${total}`);
    }
    await expect(bar.getByRole("button", { name: "다음 변화" })).toBeDisabled();
    await page.getByRole("link", { name: /확인 완료 · 대시보드로/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(errors).toEqual([]);
  });

  test("보고서 목차: 지금 읽는 절을 표시하고, 누르면 그 절로 이동한다", async ({ page }) => {
    test.skip(isMobile(page), "목차는 넓은 화면에서만 보인다");
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "보고서로 저장" }).first().click();
    await page.getByRole("link", { name: "보고서 열기" }).click();
    const toc = page.getByRole("navigation", { name: "보고서 목차" });
    await expect(toc.locator('[aria-current="location"]')).toContainText("핵심 요약");
    // 이미 보고서에 와 있으므로 알림의 '보고서 열기'는 사라진다.
    await expect(page.getByRole("link", { name: "보고서 열기" })).toHaveCount(0);

    await toc.getByRole("link", { name: /권장 행동/ }).click();
    await expect(page.getByRole("heading", { name: "5. 권장 행동" })).toBeInViewport();
    await expect(page.getByRole("heading", { name: "5. 권장 행동" })).toBeFocused();
    await expect(toc.locator('[aria-current="location"]')).toContainText("권장 행동");
  });

  test("처음 방문 안내는 한 번 닫으면 다시 나오지 않는다", async ({ page }) => {
    await page.goto("/dashboard");
    const guide = page.getByRole("complementary", { name: "처음이라면 이 순서로 보세요" });
    await expect(guide).toBeVisible();
    await guide.getByRole("button", { name: /알겠어요/ }).click();
    await expect(guide).toHaveCount(0);
    await page.reload();
    await expect(page.locator('section[aria-labelledby="brief-title"]')).toBeVisible();
    await expect(guide).toHaveCount(0);
  });

  test("짧은 업로드 파일은 맞춰 고른 기본 기간에서 '초기화'를 보이지 않는다", async ({ page }) => {
    await page.goto("/data");
    await page.setInputFiles('input[type="file"]', csv("짧은-파일.csv", storyCsv()));
    await page.getByRole("button", { name: "이대로 분석 시작" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
    await expect(page.locator('section[aria-labelledby="brief-title"] p').first()).toContainText("이전 7일과 비교");
    if (isMobile(page)) {
      await expect(page.getByRole("button", { name: /^최근 7일/ }).first()).not.toContainText("기본 범위에서 바꿈");
    } else {
      await expect(page.getByRole("button", { name: "초기화" })).toHaveCount(0);
    }
  });

  test("키보드: 첫 Tab은 '본문으로 건너뛰기', 화면을 옮기면 초점이 본문 시작으로 간다", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator('section[aria-labelledby="brief-title"]')).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "본문으로 건너뛰기" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main#main")).toBeFocused();

    await page.locator('a[href^="/anomalies?id="]').first().click();
    await expect(page.getByRole("navigation", { name: "변화 넘겨보기" })).toBeVisible();
    await expect(page.locator("main#main")).toBeFocused();
  });
});
