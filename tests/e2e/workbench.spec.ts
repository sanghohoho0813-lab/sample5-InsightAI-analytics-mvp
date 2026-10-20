import { expect, test } from "@playwright/test";
import { collectErrors, isMobile } from "./helpers";

test.describe("판단을 돕는 화면", () => {
  test("이상 감지: 기간 한눈에 + 행마다 변화 전후 추이, 색칠된 날을 누르면 조사로 간다", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/anomalies");
    const strip = page.locator("figure", { hasText: "기간 한눈에" });
    await expect(strip).toContainText(/30일 중 \d+일이 평소와 달랐습니다/);
    await expect(page.getByText("미확인").first()).toBeVisible();
    if (!isMobile(page)) {
      await expect(page.locator('a[href^="/anomalies?id="] svg path').first()).toBeAttached(); // 행의 작은 추이
    }
    await strip.locator("div[title*='눌러서 조사']").first().click();
    await expect(page).toHaveURL(/\/anomalies\?id=/);
    await expect(page.getByRole("heading", { level: 2, name: /무슨 변화인가/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("분석 분해 표: 이전 기간 대비 변화로 정렬하고, 이름을 누르면 그 항목으로 좁힌다", async ({ page }) => {
    await page.goto("/analytics");
    const table = page.getByRole("table", { name: /채널별 값/ });
    await expect(table.getByRole("columnheader", { name: /이번 기간/ })).toHaveAttribute("aria-sort", "descending");
    if (!isMobile(page)) {
      await table.getByRole("button", { name: "변화" }).click();
      await expect(table.getByRole("columnheader", { name: /변화/ })).toHaveAttribute("aria-sort", "descending");
      const changes = await table.locator("tbody tr td:nth-child(5)").allTextContents();
      const nums = changes.map((t) => parseFloat(t.replace("−", "-")));
      expect(nums).toEqual([...nums].sort((a, b) => b - a));
    }
    const first = table.locator("tbody tr").first().getByRole("button");
    const name = (await first.textContent())!;
    await first.click();
    await expect(table.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("예측: 지난 7일로 해 본 검증과 일별 예측 표를 함께 보여준다", async ({ page }) => {
    await page.goto("/forecast");
    const check = page.locator('section[aria-labelledby="fc-check"]');
    await expect(check).toContainText(/지난 7일을 가리고 같은 방법으로 예측해 보니, 7일 합계가 실제와 [\d.]+% 달랐습니다/);
    await expect(check.locator("span", { hasText: /^(믿을 만함|참고용|크게 빗나감)$/ })).toBeVisible();
    await expect(page.getByRole("table", { name: "다음 7일 날짜별 예측과 예상 범위" }).locator("tbody tr")).toHaveCount(7);
  });

  test("할 일: 완료로 표시하면 새로고침·다른 화면에서도 유지되고, 다시 누르면 취소된다", async ({ page }) => {
    await page.goto("/insights");
    if (isMobile(page)) await page.getByRole("button", { name: /^할 일/ }).click();
    const box = page.getByRole("checkbox").first();
    await box.click();
    await expect(box).toHaveAttribute("aria-checked", "true");
    await page.reload();
    if (isMobile(page)) await page.getByRole("button", { name: /^할 일/ }).click();
    await expect(page.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");

    await page.goto("/dashboard");
    const brief = page.locator('section[aria-labelledby="brief-title"]');
    await expect(brief.getByText(/\d개 중 1개 완료/)).toBeVisible();
    await brief.getByRole("checkbox", { checked: true }).click();
    await expect(brief.getByText(/개 완료/)).toHaveCount(0);
  });

  test("데이터 질의: 답 아래 '이어서 물어보기'로 다음 질문, 기록 지우기는 되돌릴 수 있다", async ({ page }) => {
    await page.goto("/ai");
    await page.getByRole("button", { name: /매출이 왜 (늘었어|줄었어)\?/ }).click();
    const latest = page.locator("article").first();
    await expect(latest.getByRole("heading", { name: "이어서 물어보기" })).toBeVisible();
    const next = latest.getByRole("listitem").filter({ has: page.getByRole("button") }).last().getByRole("button");
    const q = (await next.textContent())!.trim();
    await next.click();
    await expect(page.locator("article")).toHaveCount(2, { timeout: 30_000 });
    await expect(page.locator("article").first().getByRole("heading", { level: 2 })).toHaveText(q);

    await page.getByRole("button", { name: "기록 지우기" }).click();
    await expect(page.locator("article")).toHaveCount(0);
    await page.getByRole("button", { name: "되돌리기" }).click();
    await expect(page.locator("article")).toHaveCount(2);
  });

  test("보고서: 앞 기간 보고서를 만들어 지난 보고서와 비교하고, 목록에서 찾는다", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "보고서로 저장" }).first().click();
    await page.getByRole("link", { name: "보고서 열기" }).click();
    await page.getByRole("button", { name: "앞 기간 보고서 만들어 비교" }).click();
    const compare = page.locator('section[aria-labelledby="r-compare"]');
    await expect(compare).toContainText("지난 보고서와 비교");
    await expect(compare.getByRole("row")).toHaveCount(6); // 머리 + 지표 5개
    await expect(compare).toContainText(/사라진 위험 \d+건/);

    await page.goto("/reports");
    const saved = page.locator('section[aria-labelledby="saved-reports"]');
    await expect(saved.getByRole("link", { name: /보고서/ })).toHaveCount(2);
    await page.getByLabel("보고서 찾기").fill("없는 제목");
    await expect(saved.getByText("‘없는 제목’에 맞는 보고서가 없습니다.")).toBeVisible();
  });

  test("빠른 이동: 열고 → 찾고 → Enter로 이동, Esc로 닫으면 초점이 돌아온다", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator('section[aria-labelledby="brief-title"]')).toBeVisible();
    const trigger = page.getByRole("button", { name: /빠른 이동/ });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "빠른 이동" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();

    if (!isMobile(page)) {
      await page.keyboard.press("Control+k");
      await expect(dialog).toBeVisible();
    } else {
      await trigger.click();
    }
    await dialog.getByRole("combobox").fill("예측");
    await expect(dialog.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/forecast$/);
  });

  test("조사 화면: 휴대폰에서는 옆으로 밀어 다음 변화로 넘긴다", async ({ page, browserName }) => {
    test.skip(!isMobile(page) || browserName !== "chromium", "터치 제스처는 모바일 크로미움에서 확인");
    await page.goto("/anomalies");
    await page.locator('a[href^="/anomalies?id="]').first().click();
    const bar = page.getByRole("navigation", { name: "변화 넘겨보기" });
    await expect(bar).toContainText(/1 \/ \d+/);
    // 차트가 아닌 본문 제목 위에서 오른쪽 → 왼쪽으로 민다
    const cdp = await page.context().newCDPSession(page);
    const box = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    const y = box.y + box.height / 2;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 320, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 200, y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 80, y: y + 4 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(bar).toContainText(/2 \/ \d+/);
  });
});
