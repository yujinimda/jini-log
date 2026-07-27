// 레인 B 구현 전까지 skip
// 근거: spec US2, FR-008, T015.

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { headingsOf, postWithHeadings } from "./helpers/content";

// 절 제목도 콘텐츠에서 읽는다 — "코드 블록"·"접기/펼치기"는 삭제된 샘플 글의 절이었다 (C5)
const tocPost = postWithHeadings();
const sections = tocPost ? headingsOf(tocPost) : [];
const firstSection = sections[0] ?? "";
const lastSection = sections.at(-1) ?? "";

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
  test.skip(!tocPost, "절 제목이 있는 발행 글이 없습니다");

  test("넓은 화면에서는 목차가 표시된다", async ({ page }) => {
    await page.goto(`/posts/${tocPost!.slug}`);

    const toc = tocContainer(page);
    await expect(toc).toBeVisible();
    // 목차 항목은 글의 h2와 1:1이어야 한다
    await expect(toc.getByRole("link")).toHaveCount(sections.length);
    for (const section of sections) {
      await expect(toc.getByRole("link", { name: section, exact: true })).toBeVisible();
    }
  });

  test("목차 링크를 클릭하면 해당 절로 이동한다", async ({ page }) => {
    await page.goto(`/posts/${tocPost!.slug}`);

    const toc = tocContainer(page);
    await expect(toc).toBeVisible();

    await toc.getByRole("link", { name: firstSection, exact: true }).click();

    await expect(page).toHaveURL(/#.+$/);

    const heading = page.getByRole("heading", { level: 2, name: firstSection, exact: true });
    await expect(heading).toBeInViewport();
  });

  test("현재 보고 있는 절이 목차에서 하이라이트된다", async ({ page }) => {
    await page.goto(`/posts/${tocPost!.slug}`);

    const toc = tocContainer(page);
    await expect(toc).toBeVisible();

    const heading = page.getByRole("heading", { level: 2, name: lastSection, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();

    // 레인 B 마킹 방식 확정 후 좁히기
    await expect
      .poll(async () => toc.locator('a[aria-current], [data-active="true"], .active').count())
      .toBeGreaterThan(0);
  });

  // "h2가 없는 글에서는 목차를 표시하지 않는다" e2e 케이스는 유일한 픽스처였던
  // content/posts/test.mdx를 삭제하면서 함께 제거했다 (C2). SSG + dynamicParams=false라
  // 빌드 시점에 존재하는 발행 글만 방문 가능해서 런타임 픽스처를 만들 수 없다.
  // 대체 커버리지: tests/unit/toc.test.ts "절 제목이 없으면 빈 배열을 반환한다"
  // + contracts/ui.md의 "<Toc entries> 빈 배열 → null 렌더" 계약.
});
