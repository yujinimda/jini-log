// 레인 B/C 구현 전까지 실패가 정상입니다.
// 근거: quickstart V5, spec US4, SC-005, FR-010, POST /api/views 계약.

import { expect, type Page, test } from "@playwright/test";
import { adminSessionCookie } from "./helpers/auth";

const POST_SLUG = "hello-world";

async function readDashboardViewCount(page: Page, slug: string): Promise<number> {
  await page.goto("/admin");

  await expect(page.getByText(slug)).toBeVisible();

  // 레인 C 구현 후 셀렉터 조정 가능: 현재는 slug가 있는 행/카드 근처 숫자를 느슨하게 읽는다.
  const row = page
    .locator("tr, [role='row'], article, li, section, div")
    .filter({ hasText: slug })
    .first();

  await expect(row).toBeVisible();

  const text = (await row.textContent()) ?? "";
  const numbers = text.match(/\d+/g) ?? [];
  const lastNumber = numbers.at(-1);

  expect(lastNumber, `대시보드에서 ${slug} 근처 조회수 숫자를 찾지 못했습니다.`).toBeTruthy();

  return Number(lastNumber);
}

test.describe("운영자 조회 제외", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([await adminSessionCookie()]);
  });

  test("운영자 로그인 상태로 글을 반복 방문해도 조회수가 변하지 않는다", async ({ page }) => {
    const before = await readDashboardViewCount(page, POST_SLUG);
    const viewRequests: string[] = [];

    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/views")) {
        viewRequests.push(request.url());
      }
    });

    await page.goto(`/posts/${POST_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: "지니로그 시작" })).toBeVisible();

    await page.goto("/");
    await page.goto(`/posts/${POST_SLUG}`);
    await expect(page.getByRole("heading", { level: 1, name: "지니로그 시작" })).toBeVisible();

    const after = await readDashboardViewCount(page, POST_SLUG);

    expect(after).toBe(before);
    expect(viewRequests.length).toBeGreaterThanOrEqual(1);
  });

  test("봇 User-Agent의 POST /api/views는 204를 반환하고 조회수를 올리지 않는다", async ({ page, request }) => {
    const before = await readDashboardViewCount(page, POST_SLUG);

    const response = await request.post("/api/views", {
      headers: {
        "user-agent": "Googlebot/2.1",
      },
      data: {
        slug: POST_SLUG,
      },
    });

    expect(response.status()).toBe(204);

    await expect.poll(async () => readDashboardViewCount(page, POST_SLUG)).toBe(before);
  });

  test("존재하지 않는 slug의 POST /api/views도 항상 204를 반환한다", async ({ request }) => {
    const response = await request.post("/api/views", {
      data: {
        slug: "no-such-post",
      },
    });

    expect(response.status()).toBe(204);
  });
});
