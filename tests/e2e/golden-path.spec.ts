import { expect, test } from "@playwright/test";
import { choosePreset, collectErrors, periodLine } from "./helpers";

test.describe("핵심 흐름", () => {
  test("첫 방문: 숫자 카드가 아니라 '무슨 일이 있었나' 한 문장과 변화·원인·위험·행동으로 시작한다", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    const brief = page.locator('section[aria-labelledby="brief-title"]');
    await expect(brief.getByRole("heading", { level: 2 })).toHaveText(/^매출이 이전 30일보다 [\d.]+% (늘었|줄었)습니다\.$/);
    await expect(periodLine(page)).toContainText("이전 30일과 비교");
    for (const label of ["가장 큰 변화", "가능성 높은 원인", "지금 확인할 위험", "추천 다음 행동"]) {
      await expect(brief.getByRole("heading", { name: label })).toBeVisible();
    }
    // 결론마다 근거를 펼쳐 확인할 수 있다.
    await brief.getByText(/^근거 \d+개 보기/).first().click();
    await expect(brief.locator("details[open] li").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("이상치를 누르면 하나의 조사 흐름(무슨 변화 → 언제 → 어디서 → 근거 → 할 일)으로 이어진다", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator('a[href^="/anomalies?id="]').first().click();
    await expect(page).toHaveURL(/\/anomalies\?id=.+&from=%2Fdashboard/);
    for (const step of ["무슨 변화인가", "언제 시작됐고, 지금은?", "어디서 생겼나", "확인할 수 있는 근거", "지금 할 일"]) {
      await expect(page.getByRole("heading", { level: 2, name: new RegExp(step.replace("?", "\\?")) })).toBeVisible();
    }
    await expect(page.getByText("가능성 높은 원인 · 데이터 패턴으로 본 추정")).toBeVisible();

    await page.getByRole("button", { name: "그날 전후 자세히 분석" }).click();
    await expect(page).toHaveURL(/\/analytics\?metric=/);
    await expect(page.locator(".recharts-reference-line")).toHaveCount(1); // 발생일 표시
    await page.goBack();
    await page.getByRole("link", { name: /대시보드로 돌아가기/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("드릴다운 후 돌아오면 원래 범위로 복원된다(링크·브라우저 뒤로)", async ({ page }) => {
    await page.goto("/dashboard");
    const before = await periodLine(page).textContent();
    const brief = page.locator('section[aria-labelledby="brief-title"]');

    await brief.getByRole("button", { name: /만 보기/ }).first().click();
    await expect(page).toHaveURL(/\/analytics\?metric=/);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("분석"); // 무엇을 보러 왔는지
    await page.goBack();
    await expect(periodLine(page)).toHaveText(before!);

    await brief.getByRole("button", { name: /만 보기/ }).first().click();
    await page.getByRole("button", { name: /대시보드로 돌아가기/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(periodLine(page)).toHaveText(before!);
  });

  test("비교 기간이 없는 '최근 90일'은 증감을 지어내지 않는다", async ({ page }) => {
    await page.goto("/dashboard");
    await choosePreset(page, 90);
    await expect(periodLine(page)).toContainText("비교할 이전 기간 없음");
    await expect(page.getByText("비교 없음").first()).toBeVisible();
    await expect(page.locator('section[aria-labelledby="brief-title"] h2')).not.toHaveText(/늘었|줄었/);
  });

  test("보고서: 저장 → 업무 기록 구조 → 새로고침 유지 → 이름 변경 → 삭제 후 되돌리기", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "보고서로 저장" }).first().dblclick(); // 연속 클릭은 한 번만 저장
    // 두 번째 클릭은 '저장된 보고서 보기'로 바뀐 자리에 닿아 바로 보고서로 갈 수 있다 — 그때는 알림의 '보고서 열기'가 숨는다.
    const open = page.getByRole("link", { name: "보고서 열기" });
    await expect(open.or(page.getByRole("heading", { name: "1. 핵심 요약" }))).toBeVisible();
    if (await open.isVisible()) await open.click();
    await expect(page).toHaveURL(/\/reports\?id=/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("insightai.reports")!).length)).toBe(1);

    await page.reload();
    for (const h of ["1. 핵심 요약", "2. 분석 범위", "3. 주요 발견", "4. 위험 요소", "5. 권장 행동", "6. 생성 시점"]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }

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
    await expect(row).toContainText(/검색 광고 매출 \+₩/);
    await row.getByRole("button").click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("데이터 질의: 데이터에 맞춘 질문 → 답·근거·이어 볼 화면, 다른 화면에 다녀와도 남는다", async ({ page }) => {
    await page.goto("/ai");
    await page.getByRole("button", { name: /매출이 왜 (늘었어|줄었어)\?/ }).click();
    const answer = page.locator("article").first();
    await expect(answer).toContainText("규칙 기반 계산");
    await expect(answer.getByRole("heading", { name: "근거 · 화면과 같은 계산" })).toBeVisible();
    await expect(answer.getByRole("button", { name: /만 보기/ })).toBeVisible();

    await page.goto("/insights");
    await page.goto("/ai");
    await expect(page.locator("article").first()).toContainText("규칙 기반 계산");
    await page.getByRole("button", { name: "기록 지우기" }).click();
    await expect(page.locator("article")).toHaveCount(0);
  });
});
