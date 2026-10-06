import { expect, test } from "@playwright/test";
import { choosePreset, collectErrors, scopeLine } from "./helpers";

test.describe("핵심 흐름", () => {
  test("첫 방문: 루트는 대시보드로, 샘플 데이터로 답부터 보여준다", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { level: 2, name: /매출 .+(늘었|줄었)습니다/ })).toBeVisible();
    await expect(scopeLine(page)).toHaveText("최근 30일 · 이전 30일과 비교");
    expect(errors).toEqual([]);
  });

  test("드릴다운 후 돌아오면 원래 범위로 복원된다(링크·브라우저 뒤로)", async ({ page }) => {
    await page.goto("/dashboard");
    const before = await scopeLine(page).textContent();

    await page.getByRole("button", { name: /그날 전후 분석 보기/ }).first().click();
    await expect(page).toHaveURL(/\/analytics\?metric=/);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("분석"); // 무엇을 보러 왔는지
    await expect(page.locator(".recharts-reference-line")).toHaveCount(1); // 발생일 표시
    await page.goBack();
    await expect(scopeLine(page)).toHaveText(before!);

    await page.getByRole("button", { name: /만 보기/ }).first().click();
    await page.getByRole("button", { name: /대시보드로 돌아가기/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(scopeLine(page)).toHaveText(before!);
  });

  test("비교 기간이 없는 '최근 90일'은 증감을 지어내지 않는다", async ({ page }) => {
    await page.goto("/dashboard");
    await choosePreset(page, 90);
    await expect(scopeLine(page)).toHaveText("최근 90일 · 비교할 이전 기간 없음");
    await expect(page.getByText("비교 없음").first()).toBeVisible();
    await expect(page.getByText(/100\.0% 늘었/)).toHaveCount(0);
  });

  test("보고서: 저장 → 새로고침 유지 → 이름 변경 → 삭제 후 되돌리기", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "보고서로 저장" }).dblclick(); // 연속 클릭은 한 번만 저장
    await page.getByRole("link", { name: "보고서 열기" }).click();
    await expect(page).toHaveURL(/\/reports\?id=/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("insightai.reports")!).length)).toBe(1);

    await page.reload();
    await expect(page.getByRole("heading", { name: "핵심 지표" })).toBeVisible();

    await page.getByRole("button", { name: "제목 수정" }).click();
    await page.getByLabel("보고서 제목").fill("9월 매출 점검");
    await page.getByLabel("보고서 제목").press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("9월 매출 점검");

    await page.getByRole("button", { name: /이 보고서 삭제/ }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await page.getByRole("button", { name: "되돌리기" }).click();
    await expect(page.locator('section[aria-labelledby="saved-reports"] li')).toHaveCount(1);
  });

  test("다른 샘플 분석 → 분석 기록에 실제 요인이 남고 다시 열 수 있다", async ({ page }) => {
    await page.goto("/data");
    await page.locator("li", { hasText: "마케팅 성과 데이터" }).getByRole("button", { name: "분석하기" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });
    await expect(page.getByRole("button", { name: /분석 데이터 바꾸기 — 지금 마케팅 성과 데이터/ }).first()).toBeAttached();

    await page.goto("/data");
    const row = page.locator('section[aria-labelledby="history-title"] li').first();
    await expect(row).toContainText("마케팅 성과 데이터");
    await row.getByRole("button").click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("데이터 질의: 답변 출처를 밝히고, 다른 화면에 다녀와도 대화가 남는다", async ({ page }) => {
    await page.goto("/ai");
    await page.getByRole("button", { name: "가장 잘 팔린 상품은?" }).click();
    await expect(page.getByText("InsightAI · 규칙 기반 답변")).toBeVisible();
    await page.goto("/insights");
    await page.goto("/ai");
    await expect(page.getByText("InsightAI · 규칙 기반 답변")).toBeVisible();
    await page.getByRole("button", { name: "대화 지우기" }).click();
    await expect(page.getByText("이런 질문을 할 수 있습니다")).toBeVisible();
  });
});
