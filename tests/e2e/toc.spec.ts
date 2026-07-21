// 레인 B 구현 전까지 skip
// 근거: spec US2, FR-008, T015.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";

const hasToc = existsSync(resolve(__dirname, "../../components/blog/toc.tsx"));

test.use({ viewport: { width: 1440, height: 900 } });

function tocContainer(page: Page): Locator {
  // 레인 B 셀렉터 확정 후 조정 가능
  return page
    .locator('nav[aria-label*="목차"], aside:has-text("목차"), section:has-text("목차"), [data-testid="toc"]')
    .first();
}

test.describe("본문 목차", () => {
  test.skip(!hasToc, "레인 B toc 구현 전까지 skip");

  test("넓은 화면에서는 목차가 표시된다", async ({ page }) => {
    await page.goto("/posts/hello-world");

    const toc = tocContainer(page);
    await expect(toc).toBeVisible();
    await expect(toc.getByRole("link", { name: "코드 블록" })).toBeVisible();
    await expect(toc.getByRole("link", { name: "접기/펼치기" })).toBeVisible();
  });

  test("목차 링크를 클릭하면 해당 절로 이동한다", async ({ page }) => {
    await page.goto("/posts/hello-world");

    const toc = tocContainer(page);
    await expect(toc).toBeVisible();

    await toc.getByRole("link", { name: "코드 블록" }).click();

    await expect(page).toHaveURL(/#.+$/);

    const heading = page.getByRole("heading", { level: 2, name: "코드 블록" });
    await expect(heading).toBeInViewport();
  });

  test("현재 보고 있는 절이 목차에서 하이라이트된다", async ({ page }) => {
    await page.goto("/posts/hello-world");

    const toc = tocContainer(page);
    await expect(toc).toBeVisible();

    const heading = page.getByRole("heading", { level: 2, name: "접기/펼치기" });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();

    // 레인 B 마킹 방식 확정 후 좁히기
    await expect
      .poll(async () => toc.locator('a[aria-current], [data-active="true"], .active').count())
      .toBeGreaterThan(0);
  });

  test("h2가 없는 글에서는 목차를 표시하지 않는다", async ({ page }) => {
    await page.goto("/posts/test");

    await expect(
      page.locator('nav[aria-label*="목차"], aside:has-text("목차"), section:has-text("목차"), [data-testid="toc"]'),
    ).toHaveCount(0);
  });
});
