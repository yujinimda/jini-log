// 레인 B/C 구현 전까지 실패가 정상입니다.
// 근거: quickstart V3, spec US2, SC-002, FR-004.

import { expect, test } from "@playwright/test";
import { anyPost, firstTagOf, hasCodeFence, titlePattern, usesComponent } from "./helpers/content";

// 픽스처는 실제 콘텐츠에서 읽는다 — 글을 지우면 깨지던 하드코딩 제거 (C5)
const sample = anyPost();

test.describe("독자 열람·인터랙티브·복사", () => {
  // C4에서 좌측 "전체 글" 레일이 추가돼 같은 글로 가는 링크가 본문·레일 두 곳에 존재한다.
  // 검증 대상은 본문 목록이므로 main으로 스코프를 좁힌다 (레일은 아래 별도 테스트).
  test("비로그인 독자는 홈에서 발행 글을 열고 상세 본문을 읽을 수 있다", async ({ page }) => {
    await page.goto("/");

    const postLink = page.getByRole("main").getByRole("link", { name: titlePattern(sample) });
    await expect(postLink).toBeVisible();

    await postLink.click();

    await expect(page).toHaveURL(new RegExp(`/posts/${sample.slug}$`));
    await expect(page.getByRole("heading", { level: 1, name: sample.title })).toBeVisible();
  });

  test("태그 페이지에는 해당 태그의 발행 글이 노출된다", async ({ page }) => {
    // 태그도 콘텐츠에서 얻는다 — "meta" 하드코딩은 그 태그를 쓰는 글이 사라지면 깨진다
    const tag = firstTagOf(sample);
    test.skip(!tag, "태그가 달린 발행 글이 없습니다");

    await page.goto(`/tags/${encodeURIComponent(tag!)}`);

    await expect(
      page.getByRole("main").getByRole("link", { name: titlePattern(sample) }),
    ).toBeVisible();
  });

  test("Collapse 컴포넌트는 페이지 이동 없이 열리고 닫힌다", async ({ page }) => {
    // 문구를 하드코딩하지 않는다 — 삭제된 샘플 글의 문장이었다 (C5).
    // 본문 안 Collapse만 대상으로 한다 (목차의 접이식 details는 제외).
    test.skip(!usesComponent(sample, "Collapse"), "Collapse를 쓰는 발행 글이 없습니다");

    await page.goto(`/posts/${sample.slug}`);
    const originalUrl = page.url();

    const details = page.locator(".prose details").first();
    await expect(details).toBeAttached();
    const summary = details.locator("summary").first();

    await expect(details).not.toHaveJSProperty("open", true);

    await summary.click();
    await expect(details).toHaveJSProperty("open", true);
    expect(page.url()).toBe(originalUrl);

    await summary.click();
    await expect(details).not.toHaveJSProperty("open", true);
    expect(page.url()).toBe(originalUrl);
  });

  test("코드 블록 복사 버튼은 코드 내용을 클립보드에 복사한다", async ({ page, context }) => {
    test.skip(!hasCodeFence(sample), "코드 블록이 있는 발행 글이 없습니다");

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/posts/${sample.slug}`);

    // 기대값도 화면에서 얻는다 — "greet"은 삭제된 샘플 글의 함수명이었다 (C5)
    const firstToken = (await page.locator(".prose pre").first().innerText())
      .split(/\s+/)
      .find((t) => t.length > 2);

    await page.getByRole("button", { name: "코드 복사" }).first().click();

    await expect
      .poll(async () => page.evaluate(() => navigator.clipboard.readText()))
      .toContain(firstToken!);
  });

  test("초안은 공개 페이지에 노출되지 않고 상세 URL은 404다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /sample-draft/i })).toHaveCount(0);
    await expect(page.getByText(/sample-draft/i)).toHaveCount(0);

    const response = await page.goto("/posts/sample-draft");
    expect(response?.status()).toBe(404);
  });
});
