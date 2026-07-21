// 레인 B/C 구현 전까지 실패가 정상입니다.
// 근거: quickstart V3, spec US2, SC-002, FR-004.

import { expect, test } from "@playwright/test";

test.describe("독자 열람·인터랙티브·복사", () => {
  test("비로그인 독자는 홈에서 발행 글을 열고 상세 본문을 읽을 수 있다", async ({ page }) => {
    await page.goto("/");

    const postLink = page.getByRole("link", { name: /지니로그 시작/ });
    await expect(postLink).toBeVisible();

    await postLink.click();

    await expect(page).toHaveURL(/\/posts\/hello-world$/);
    await expect(page.getByRole("heading", { level: 1, name: "지니로그 시작" })).toBeVisible();
  });

  test("태그 페이지에는 해당 태그의 발행 글이 노출된다", async ({ page }) => {
    await page.goto("/tags/meta");

    await expect(page.getByRole("link", { name: /지니로그 시작/ })).toBeVisible();
  });

  test("Collapse 컴포넌트는 페이지 이동 없이 열리고 닫힌다", async ({ page }) => {
    await page.goto("/posts/hello-world");
    const originalUrl = page.url();

    const summary = page.getByText("왜 파일 기반 MDX인가?", { exact: true });
    const details = page.locator("details").filter({ has: summary });
    const hiddenContent = page.getByText("글이 곧 코드라서");

    await expect(details).not.toHaveJSProperty("open", true);
    await expect(hiddenContent).not.toBeVisible();

    await summary.click();

    await expect(details).toHaveJSProperty("open", true);
    await expect(hiddenContent).toBeVisible();
    expect(page.url()).toBe(originalUrl);

    await summary.click();

    await expect(details).not.toHaveJSProperty("open", true);
    await expect(hiddenContent).not.toBeVisible();
    expect(page.url()).toBe(originalUrl);
  });

  test("코드 블록 복사 버튼은 코드 내용을 클립보드에 복사한다", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/posts/hello-world");

    await page.getByRole("button", { name: "코드 복사" }).click();

    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("greet");
  });

  test("초안은 공개 페이지에 노출되지 않고 상세 URL은 404다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /sample-draft/i })).toHaveCount(0);
    await expect(page.getByText(/sample-draft/i)).toHaveCount(0);

    const response = await page.goto("/posts/sample-draft");
    expect(response?.status()).toBe(404);
  });
});
